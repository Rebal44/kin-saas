import { kimiRespond } from './kimi';
import { isOpenClawEnabled, openclawRespond } from './openclaw';

export async function agentRespond(params: {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  userId?: string;
  sessionKey?: string;
}): Promise<string> {
  if (isOpenClawEnabled()) {
    return openclawRespond({
      message: params.message,
      history: params.history,
      userId: params.userId,
      sessionKey: params.sessionKey,
    });
  }

  return kimiRespond({ message: params.message, history: params.history });
}

