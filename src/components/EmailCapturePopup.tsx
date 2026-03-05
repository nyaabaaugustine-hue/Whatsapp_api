import { useState, useEffect } from 'react';
import { X, Mail, Gift, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

export function EmailCapturePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const hasSeenPopup = localStorage.getItem('email_popup_seen');
    const hasSubscribed = localStorage.getItem('email_subscribed');

    if (!hasSeenPopup && !hasSubscribed) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('email_popup_seen', 'true');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'josemorgan120@gmail.com',
          subject: 'New Email Subscriber',
          html: `<p>New subscriber: ${email}</p>`
        })
      });

      setSubmitted(true);
      localStorage.setItem('email_subscribed', 'true');
      
      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (error) {
      console.error('Subscription failed:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-gradient-to-br from-[#111b21] to-[#0b141a] border-2 border-[#00a884] rounded-2xl shadow-2xl animate-in zoom-in duration-300">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-[#8696a0] hover:text-[#e9edef] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          {!submitted ? (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00a884]/20 to-[#25D366]/20 border-2 border-[#00a884] flex items-center justify-center">
                  <Gift className="w-8 h-8 text-[#00a884]" />
                </div>
              </div>

              <h2 className="text-2xl font-black text-[#e9edef] text-center mb-2">
                Get GHS 500 Off!
              </h2>
              <p className="text-[#8696a0] text-center mb-6">
                Subscribe to our newsletter and get an exclusive discount on your first purchase
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8696a0]" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-[#0b141a] border-[#2f3b43] text-[#e9edef]"
                    required
                  />
                </div>

                <Button type="submit" size="lg" className="w-full h-12">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Claim My Discount
                </Button>
              </form>

              <p className="text-xs text-[#8696a0] text-center mt-4">
                No spam, unsubscribe anytime. Terms apply.
              </p>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-[#00a884]/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-[#00a884]" />
              </div>
              <h3 className="text-xl font-bold text-[#e9edef] mb-2">
                Welcome Aboard! 🎉
              </h3>
              <p className="text-[#8696a0]">
                Check your email for your exclusive discount code
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}