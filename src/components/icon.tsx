import {
  Baby, Briefcase, Car, Coffee, Dog, Dumbbell, Film, Fuel, Gift, GraduationCap, HeartPulse, Home, Landmark, Laptop,
  PiggyBank, Plane, PlusCircle, Receipt, Repeat, ShoppingBag, ShoppingCart, Smartphone, Tag, TrendingUp, Utensils, Wifi,
  Wrench, Zap, type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  tag: Tag, briefcase: Briefcase, laptop: Laptop, "trending-up": TrendingUp, "plus-circle": PlusCircle, utensils: Utensils,
  "shopping-cart": ShoppingCart, car: Car, zap: Zap, home: Home, "heart-pulse": HeartPulse, film: Film,
  "shopping-bag": ShoppingBag, "graduation-cap": GraduationCap, repeat: Repeat, gift: Gift, plane: Plane, coffee: Coffee,
  smartphone: Smartphone, wifi: Wifi, baby: Baby, dog: Dog, dumbbell: Dumbbell, wrench: Wrench, landmark: Landmark,
  "piggy-bank": PiggyBank, receipt: Receipt, fuel: Fuel,
};

export function CategoryIcon({ name, color, size = "md" }: { name: string; color: string; size?: "sm" | "md" | "lg" }) {
  const Icon = MAP[name] ?? Tag;
  const box = size === "sm" ? "size-7 rounded-lg" : size === "lg" ? "size-11 rounded-2xl" : "size-9 rounded-xl";
  const icon = size === "sm" ? 14 : size === "lg" ? 20 : 16;
  return (
    <span className={`grid shrink-0 place-items-center ${box}`} style={{ backgroundColor: `${color}1f`, color }}>
      <Icon size={icon} strokeWidth={2.2} />
    </span>
  );
}

export function iconFor(name: string) {
  return MAP[name] ?? Tag;
}
