import { MapPin, ExternalLink } from 'lucide-react';

export function LocationCard() {
  return (
    <div className="rounded-xl overflow-hidden border border-[#2f3b43] bg-[#111b21] mb-2 w-full">
      {/* Map Preview — embedded iframe thumbnail */}
      <div className="relative w-full" style={{ height: '160px' }}>
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3970.335437683203!2d-0.020876025014040966!3d5.664538894316926!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xfdf80bf841a7467%3A0xfebec4f934f6ba17!2sTGNE%20Solutions!5e0!3m2!1sen!2sgh!4v1772412561896!5m2!1sen!2sgh"
          width="100%"
          height="160"
          style={{ border: 0, display: 'block', pointerEvents: 'none' }}
          allowFullScreen={false}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Drivemond Location"
        />
        {/* Overlay so tapping opens Google Maps instead of interacting with iframe */}
        <a
          href="https://maps.app.goo.gl/M6YFZbczLt7GPQhC7"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0"
          aria-label="Open in Google Maps"
        />
      </div>

      {/* Location Info Row — exactly like WhatsApp */}
      <a
        href="https://maps.app.goo.gl/M6YFZbczLt7GPQhC7"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors group"
      >
        <div className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center shrink-0">
          <MapPin className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[#e9edef] text-[13px] font-semibold leading-tight truncate">Drivemond Showroom</p>
          <p className="text-[#8696a0] text-[11px] mt-0.5 truncate">TGNE Solutions, Spintex Road, Accra</p>
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-[#8696a0] group-hover:text-[#00a884] transition-colors shrink-0" />
      </a>
    </div>
  );
}
