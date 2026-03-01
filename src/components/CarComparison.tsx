import { CAR_DATABASE } from '../data/cars';

interface CarComparisonProps {
  carIds: string[];
  onSelect: (carId: string) => void;
}

export function CarComparison({ carIds, onSelect }: CarComparisonProps) {
  const cars = carIds.map(id => CAR_DATABASE.find(c => c.id === id)).filter(Boolean);

  if (cars.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {cars.map((car) => (
        <div
          key={car!.id}
          className="bg-[#1a2730] rounded-lg p-3 border border-[#2f3b43] hover:border-[#00a884] transition-colors cursor-pointer"
          onClick={() => onSelect(car!.id)}
        >
          <div className="flex items-start space-x-3">
            <img
              src={car!.image_url}
              alt={`${car!.brand} ${car!.model}`}
              className="w-20 h-20 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-[#e9edef] font-bold text-sm mb-1">
                {car!.year} {car!.brand} {car!.model}
              </h4>
              <div className="flex flex-wrap gap-2 text-xs text-[#8696a0] mb-2">
                <span>🛣 {car!.mileage}</span>
                <span>⚙️ {car!.transmission}</span>
                <span>⛽ {car!.fuel_type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#00a884] font-bold text-base">
                  ₵{car!.price.toLocaleString()}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(car!.id);
                  }}
                  className="text-[#00a884] text-xs font-bold hover:underline"
                >
                  View Details →
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
