-- Create Stripe customer when new user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- The actual Stripe customer creation is handled by the webhook
    -- This function ensures our users table is in sync
    INSERT INTO public.users (clerk_id, email, full_name, avatar_url, subscription_status)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        'inactive'
    )
    ON CONFLICT (clerk_id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user (if using Supabase Auth)
-- CREATE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Cleanup old webhook events (run daily via cron)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void AS $$
BEGIN
    DELETE FROM webhook_events 
    WHERE created_at < NOW() - INTERVAL '30 days' 
    AND processed = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Get user stats function
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE (
    total_messages BIGINT,
    messages_this_month BIGINT,
    subscription_status TEXT,
    subscription_ends_at TIMESTAMP WITH TIME ZONE,
    days_remaining INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM conversations WHERE user_id = p_user_id) as total_messages,
        (SELECT COUNT(*) FROM conversations 
         WHERE user_id = p_user_id 
         AND created_at >= DATE_TRUNC('month', NOW())) as messages_this_month,
        u.subscription_status,
        s.current_period_end as subscription_ends_at,
        CASE 
            WHEN s.current_period_end IS NOT NULL 
            THEN EXTRACT(DAY FROM (s.current_period_end - NOW()))::INTEGER
            ELSE 0 
        END as days_remaining
    FROM users u
    LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
    WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Track usage function
CREATE OR REPLACE FUNCTION track_usage(
    p_user_id UUID,
    p_action TEXT,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
    INSERT INTO usage_logs (user_id, action, metadata)
    VALUES (p_user_id, p_action, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
