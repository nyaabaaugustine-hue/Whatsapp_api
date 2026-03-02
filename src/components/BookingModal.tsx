import { useState } from 'react';
import { X, Clock, Check } from 'lucide-react';

interface BookingModalProps {
  carName: string;
  carId: string;
  onConfirm: (carId: string, carName: string, date: string, time: string) => void;
  onClose: () => void;
}

const TIME_SLOTS = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function BookingModal({ carName, carId, onConfirm, onClose }: BookingModalProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const getDaysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDay = (m: number, y: number) => new Date(y, m, 1).getDay();

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const isDisabled = (day: number) => {
    const d = new Date(currentYear, currentMonth, day);
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return d < todayMidnight || d.getDay() === 0;
  };

  const formatDisplay = () => {
    if (!selectedDate) return null;
    const [y, m, d] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'long'
    });
  };

  const handleConfirm = () => {
    if (!selectedDate || !selectedTime) return;
    setConfirmed(true);
    setTimeout(() => onConfirm(carId, carName, selectedDate, selectedTime), 1800);
  };

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDay(currentMonth, currentYear);

  return (
    <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="bg-[#111b21] rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#2a3942]">
          <div>
            <h3 className="text-[#e9edef] font-bold text-base">📅 Book a Viewing</h3>
            <p className="text-[#00a884] text-xs mt-0.5 truncate max-w-[200px]">{carName}</p>
          </div>
          <button onClick={onClose} className="text-[#8696a0] hover:text-white p-1 rounded-full hover:bg-white/10 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {confirmed ? (
          <div className="flex flex-col items-center justify-center py-14 px-5">
            <div className="w-16 h-16 bg-[#00a884] rounded-full flex items-center justify-center mb-4">
              <Check className="w-9 h-9 text-white" strokeWidth={3} />
            </div>
            <p className="text-[#e9edef] font-bold text-lg">Booking Confirmed!</p>
            <p className="text-[#8696a0] text-sm mt-1 text-center">{formatDisplay()} at {selectedTime}</p>
            <p className="text-[#8696a0] text-xs mt-2 text-center">Our team will call you to confirm the appointment.</p>
          </div>
        ) : (
          <>
            {/* Calendar */}
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-center justify-between mb-3">
                <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-[#8696a0] hover:text-white transition text-lg">‹</button>
                <span className="text-[#e9edef] font-semibold text-sm">{MONTH_NAMES[currentMonth]} {currentYear}</span>
                <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-[#8696a0] hover:text-white transition text-lg">›</button>
              </div>

              <div className="grid grid-cols-7 mb-1">
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                  <div key={d} className="text-center text-[10px] text-[#8696a0] font-medium py-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-y-0.5">
                {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const ds = `${currentYear}-${String(currentMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                  const disabled = isDisabled(day);
                  const selected = selectedDate === ds;
                  return (
                    <button
                      key={day}
                      disabled={disabled}
                      onClick={() => { setSelectedDate(ds); setSelectedTime(null); }}
                      className={`
                        h-9 w-full rounded-full text-xs font-medium transition-all
                        ${disabled ? 'text-[#3c4a50] cursor-not-allowed' : 'hover:bg-[#2a3942] text-[#e9edef] cursor-pointer'}
                        ${selected ? 'bg-[#00a884] !text-white hover:bg-[#008f72]' : ''}
                      `}
                    >{day}</button>
                  );
                })}
              </div>
            </div>

            {/* Time Slots */}
            {selectedDate && (
              <div className="px-4 pt-3 pb-2 border-t border-[#2a3942]">
                <p className="text-[#8696a0] text-xs mb-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Available times
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {TIME_SLOTS.map(time => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`py-1.5 rounded-lg text-xs font-medium transition-all
                        ${selectedTime === time
                          ? 'bg-[#00a884] text-white'
                          : 'bg-[#2a3942] text-[#e9edef] hover:bg-[#3b4a54]'
                        }`}
                    >{time}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Summary & Confirm */}
            <div className="px-4 py-4">
              {selectedDate && selectedTime && (
                <p className="text-[#8696a0] text-xs text-center mb-3">
                  ✅ {formatDisplay()} at {selectedTime}
                </p>
              )}
              <button
                onClick={handleConfirm}
                disabled={!selectedDate || !selectedTime}
                className="w-full bg-[#00a884] disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-sm transition-all hover:bg-[#008f72] active:scale-95"
              >
                Confirm Viewing
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
