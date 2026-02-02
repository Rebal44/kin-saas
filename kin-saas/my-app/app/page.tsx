import { Hero } from "@/components/hero";
import { Features } from "@/components/features";
import { ProblemSolution } from "@/components/problem-solution";
import { Pricing } from "@/components/pricing";
import { CTA } from "@/components/cta";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <ProblemSolution />
      <Features />
      <Pricing />
      <CTA />
      <Footer />
    </main>
  );
}
