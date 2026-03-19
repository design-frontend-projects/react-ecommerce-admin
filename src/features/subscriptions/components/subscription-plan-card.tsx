import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: "month" | "year";
  features: string[];
  isPopular?: boolean;
}

interface SubscriptionPlanCardProps {
  plan: SubscriptionPlan;
  isSelected: boolean;
  onSelect: (plan: SubscriptionPlan) => void;
  isLoading?: boolean;
}

export function SubscriptionPlanCard({
  plan,
  isSelected,
  onSelect,
  isLoading
}: SubscriptionPlanCardProps) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Card
        className={cn(
          "relative h-full flex flex-col cursor-pointer transition-all duration-200",
          isSelected
            ? "border-primary shadow-md ring-1 ring-primary"
            : "hover:border-primary/50",
          plan.isPopular && "border-primary/50"
        )}
        onClick={() => onSelect(plan)}
      >
        {plan.isPopular && (
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4">
            <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
              Mọi người hay dùng
            </span>
          </div>
        )}
        <CardHeader>
          <CardTitle className="text-xl">{plan.name}</CardTitle>
          <CardDescription className="min-h-[40px]">{plan.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="mb-6 flex items-baseline text-3xl font-bold">
            {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(plan.price)}
            <span className="text-sm font-normal text-muted-foreground ml-1">
              /{plan.interval === "month" ? "tháng" : "năm"}
            </span>
          </div>
          <ul className="space-y-3">
            {plan.features.map((feature, i) => (
              <li key={i} className="flex items-start text-sm">
                <Check className="h-4 w-4 text-primary mr-2 mt-0.5 shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            variant={isSelected ? "default" : "outline"}
            disabled={isLoading}
          >
            {isSelected ? "Đã chọn" : "Chọn gói này"}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
