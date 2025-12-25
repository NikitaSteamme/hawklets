import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Check, Users, Smartphone, Zap, Target, Gamepad2, Heart, TrendingUp, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const Home = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleWaitlistSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/waitlist`, {
        name: name || undefined,
        email: email
      });
      
      toast.success("You're on the list!", {
        description: "We'll notify you when Hawklets launches.",
      });
      
      setEmail('');
      setName('');
    } catch (error) {
      toast.error("Error", {
        description: error.response?.data?.detail || "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const scrollToWaitlist = () => {
    document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-amber-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">H</span>
              </div>
              <span className="text-2xl font-bold text-amber-900">Hawklets</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#how-it-works" className="text-amber-900 hover:text-amber-600 transition-colors">How It Works</a>
              <a href="#for-whom" className="text-amber-900 hover:text-amber-600 transition-colors">For Whom</a>
              <a href="#status" className="text-amber-900 hover:text-amber-600 transition-colors">Project Status</a>
            </nav>
            <Button onClick={scrollToWaitlist} className="bg-amber-500 hover:bg-amber-600 text-white">
              Join Waitlist
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-5xl lg:text-6xl font-bold text-amber-950 leading-tight">
                Real Progress.
                <span className="block text-amber-600">Verified.</span>
              </h1>
              <p className="text-xl text-amber-900/80 leading-relaxed">
                Growth happens in real life. Hawklets verifies your actions and turns them into motivation, levels, and achievements.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={scrollToWaitlist}
                  size="lg" 
                  className="bg-amber-500 hover:bg-amber-600 text-white text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  Join the Waitlist
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                  className="border-2 border-amber-500 text-amber-700 hover:bg-amber-50 text-lg px-8 py-6 rounded-xl transition-all"
                >
                  How It Works
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="relative z-10">
                <img 
                  src="https://customer-assets.emergentagent.com/job_progress-verify/artifacts/bhlala9g_ChatGPT%20Image%20Dec%2024%2C%202025%2C%2002_20_15%20PM.png"
                  alt="Hawklets mascots"
                  className="w-full h-auto drop-shadow-2xl"
                />
              </div>
              <div className="absolute inset-0 bg-amber-200/30 rounded-full blur-3xl -z-0"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Mantra Section */}
      <section className="py-16 bg-amber-100/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <blockquote className="text-2xl lg:text-3xl font-semibold text-amber-950 leading-relaxed">
              "The device verifies. The app motivates. The community grows together."
            </blockquote>
          </div>
        </div>
      </section>

      {/* What is Hawklets */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-amber-950 mb-4">
              What is Hawklets?
            </h2>
            <p className="text-xl text-amber-900/70 max-w-2xl mx-auto">
              A community-driven platform where real-world actions become progress
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 border-amber-200 hover:border-amber-400 transition-all hover:shadow-xl bg-white">
              <CardHeader>
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-amber-600" />
                </div>
                <CardTitle className="text-2xl text-amber-950">Community</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base text-amber-900/70">
                  People growing step by step, without pressure or competition. We celebrate progress, not perfection.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-2 border-amber-200 hover:border-amber-400 transition-all hover:shadow-xl bg-white">
              <CardHeader>
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-4">
                  <Zap className="w-8 h-8 text-amber-600" />
                </div>
                <CardTitle className="text-2xl text-amber-950">Verifier Device</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base text-amber-900/70">
                  A small gadget acting as your referee. It doesn't motivate or judge—it only confirms your action happened.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-2 border-amber-200 hover:border-amber-400 transition-all hover:shadow-xl bg-white">
              <CardHeader>
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-4">
                  <Smartphone className="w-8 h-8 text-amber-600" />
                </div>
                <CardTitle className="text-2xl text-amber-950">Mobile App</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base text-amber-900/70">
                  Turns verified actions into goals, levels, challenges, events, and virtual rewards that keep you coming back.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-gradient-to-b from-white to-amber-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-amber-950 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-amber-900/70 max-w-2xl mx-auto">
              From real-world action to gamified progress in 5 simple steps
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-8">
            {[
              { step: 1, title: "Choose Your Goal", desc: "Select a challenge or create your own goal in the Hawklets app" },
              { step: 2, title: "Take Action", desc: "Perform the activity in real life—workout, study session, creative project" },
              { step: 3, title: "Get Verified", desc: "Your verifier device confirms the action was completed" },
              { step: 4, title: "Track Progress", desc: "The app records your achievement and updates your progress" },
              { step: 5, title: "Earn Rewards", desc: "Level up, unlock achievements, and celebrate with the community" }
            ].map((item, idx) => (
              <div key={idx} className="flex gap-6 items-start group">
                <div className="flex-shrink-0 w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold group-hover:scale-110 transition-transform shadow-lg">
                  {item.step}
                </div>
                <div className="flex-1 pt-2">
                  <h3 className="text-2xl font-bold text-amber-950 mb-2">{item.title}</h3>
                  <p className="text-lg text-amber-900/70">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <img 
              src="https://customer-assets.emergentagent.com/job_progress-verify/artifacts/pgubs8t8_ChatGPT%20Image%20Dec%2025%2C%202025%2C%2011_54_00%20AM.png"
              alt="Hawklets in action"
              className="w-full max-w-3xl mx-auto rounded-3xl shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Why Not a Fitness Tracker */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-amber-950 mb-4">
              Why Not Just Another Fitness Tracker?
            </h2>
            <p className="text-xl text-amber-900/70 max-w-2xl mx-auto">
              Hawklets is fundamentally different
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="border-2 border-red-200 bg-red-50/50">
                <CardHeader>
                  <CardTitle className="text-2xl text-red-900 flex items-center gap-2">
                    <span className="text-3xl">✗</span> Typical Fitness Trackers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-red-900/80">
                    <li className="flex gap-2">• Constant monitoring & tracking</li>
                    <li className="flex gap-2">• Obsession with perfect metrics</li>
                    <li className="flex gap-2">• Pressure to perform daily</li>
                    <li className="flex gap-2">• Replacing human coaching</li>
                    <li className="flex gap-2">• Focus on technique perfection</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-2 border-green-300 bg-green-50/50">
                <CardHeader>
                  <CardTitle className="text-2xl text-green-900 flex items-center gap-2">
                    <Check className="w-6 h-6" /> Hawklets Approach
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-green-900/80">
                    <li className="flex gap-2">• Simple action verification only</li>
                    <li className="flex gap-2">• Progress over perfection</li>
                    <li className="flex gap-2">• Motivation without pressure</li>
                    <li className="flex gap-2">• Supporting your journey</li>
                    <li className="flex gap-2">• Gamification as core driver</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section id="for-whom" className="py-20 bg-amber-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-amber-950 mb-4">
              Who Is Hawklets For?
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {[
              { icon: Target, title: "Goal Enthusiasts", desc: "You love setting and achieving personal milestones" },
              { icon: Gamepad2, title: "Gamification Fans", desc: "Levels, achievements, and challenges motivate you" },
              { icon: Heart, title: "Progress Seekers", desc: "You value growth over perfection" },
              { icon: TrendingUp, title: "Gadget Lovers", desc: "You enjoy tech that enhances your life" }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <Card key={idx} className="text-center hover:shadow-xl transition-shadow bg-white border-2 border-amber-200">
                  <CardHeader>
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-10 h-10 text-amber-600" />
                    </div>
                    <CardTitle className="text-xl text-amber-950">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-amber-900/70">{item.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Project Status */}
      <section id="status" className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-amber-950 mb-4">
              Current Project Status
            </h2>
            <p className="text-xl text-amber-900/70">
              Honest progress. Real development.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Card className="border-2 border-amber-200 bg-white">
              <CardContent className="p-8">
                <div className="space-y-6">
                  {[
                    { done: true, text: "Working device firmware completed" },
                    { done: true, text: "Data recording & analysis implemented" },
                    { done: true, text: "3D-printed mount designed and tested" },
                    { done: false, text: "Mobile app in active development" },
                    { done: false, text: "Preparing for BambuLab Grant application" }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        item.done ? 'bg-green-500' : 'bg-amber-200'
                      }`}>
                        {item.done && <Check className="w-5 h-5 text-white" />}
                      </div>
                      <span className={`text-lg ${
                        item.done ? 'text-amber-950' : 'text-amber-900/60'
                      }`}>{item.text}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Vision */}
      <section className="py-20 bg-gradient-to-b from-amber-50 to-amber-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-4xl lg:text-5xl font-bold text-amber-950">
              The Vision
            </h2>
            <p className="text-xl lg:text-2xl text-amber-900/80 leading-relaxed">
              Hawklets evolves into a platform of challenges and events—a motivation system powered by real actions, where a community grows together through the journey, not just the destination.
            </p>
            <div className="pt-8">
              <img 
                src="https://customer-assets.emergentagent.com/job_progress-verify/artifacts/pevfwck6_freepik__-__30139.png"
                alt="Hawklet mascot"
                className="w-64 h-64 mx-auto drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA / Waitlist */}
      <section id="waitlist" className="py-20 bg-amber-900 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <h2 className="text-4xl lg:text-5xl font-bold">
              Join the Hawklets Community Early
            </h2>
            <p className="text-xl text-amber-100">
              Be among the first to experience verified progress and gamified motivation.
            </p>
            
            <form onSubmit={handleWaitlistSubmit} className="space-y-4 mt-8">
              <Input 
                type="text"
                placeholder="Your name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-14 text-lg bg-white text-amber-900 border-amber-700"
              />
              <Input 
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-14 text-lg bg-white text-amber-900 border-amber-700"
              />
              <Button 
                type="submit"
                disabled={loading}
                size="lg"
                className="w-full h-14 text-lg bg-amber-500 hover:bg-amber-400 text-white font-semibold"
              >
                {loading ? 'Joining...' : 'Join the Waitlist'}
              </Button>
            </form>

            <p className="text-sm text-amber-200">
              No spam. Unsubscribe anytime. We respect your privacy.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-amber-950 text-amber-100 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xl">H</span>
                </div>
                <span className="text-2xl font-bold text-white">Hawklets</span>
              </div>
              <p className="text-amber-300">
                Real progress. Verified.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-white mb-4">About</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-amber-300 hover:text-white transition-colors">Our Story</a></li>
                <li><a href="#" className="text-amber-300 hover:text-white transition-colors">Team</a></li>
                <li><a href="#" className="text-amber-300 hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-white mb-4">Contact</h3>
              <ul className="space-y-2">
                <li><a href="mailto:hello@hawklets.com" className="text-amber-300 hover:text-white transition-colors">hello@hawklets.com</a></li>
                <li><a href="#" className="text-amber-300 hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-amber-300 hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-amber-800 mt-8 pt-8 text-center text-amber-400">
            <p>&copy; 2025 Hawklets. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};