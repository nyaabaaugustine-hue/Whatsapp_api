import { Shield, Award, CheckCircle, Lock, Truck, Clock } from 'lucide-react';

export function TrustBadges() {
  const badges = [
    {
      icon: Shield,
      title: 'Verified Dealer',
      description: 'Licensed & Certified'
    },
    {
      icon: CheckCircle,
      title: 'Quality Assured',
      description: 'Inspected Vehicles'
    },
    {
      icon: Lock,
      title: 'Secure Payment',
      description: 'Safe Transactions'
    },
    {
      icon: Award,
      title: 'Warranty',
      description: '30-Day Guarantee'
    },
    {
      icon: Truck,
      title: 'Free Delivery',
      description: 'Accra & Nationwide'
    },
    {
      icon: Clock,
      title: '24/7 Support',
      description: 'Always Available'
    }
  ];

  return (
    <section className="py-12 bg-[#0b141a]">
      <div className="max-w-6xl mx-auto px-5">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {badges.map((badge, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center p-4 rounded-xl bg-[#111b21] border border-[#2f3b43] hover:border-[#00a884] transition-all hover:scale-105"
            >
              <div className="w-12 h-12 rounded-full bg-[#00a884]/10 flex items-center justify-center mb-3">
                <badge.icon className="w-6 h-6 text-[#00a884]" />
              </div>
              <h3 className="text-[#e9edef] font-bold text-sm mb-1">{badge.title}</h3>
              <p className="text-[#8696a0] text-xs">{badge.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}