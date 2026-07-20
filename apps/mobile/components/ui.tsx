import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

export function Screen({ children }: { children: ReactNode }) {
  return <View className="flex-1 bg-offWhite px-5 pt-6">{children}</View>;
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <Text className="text-2xl font-extrabold text-brandCharcoal tracking-tight mb-4">
      {children}
    </Text>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <View className="rounded-2xl border border-slate-200/50 bg-white p-5 mb-4 shadow-[0_2px_8px_rgba(26,29,36,0.03)]">
      {children}
    </View>
  );
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "outline" | "danger";
}

export function Button({
  label,
  onPress,
  disabled = false,
  variant = "primary",
}: ButtonProps) {
  let btnClass = "h-12 rounded-xl px-5 flex-row items-center justify-center ";
  let textClass = "font-bold text-center text-sm ";

  if (disabled) {
    btnClass += "bg-slate-200 border border-slate-200";
    textClass += "text-slate-400";
  } else {
    switch (variant) {
      case "primary":
        btnClass += "bg-brandAmber border border-brandAmber";
        textClass += "text-brandCharcoal font-extrabold";
        break;
      case "secondary":
        btnClass += "bg-brandCharcoal border border-brandCharcoal";
        textClass += "text-white";
        break;
      case "outline":
        btnClass += "bg-transparent border border-brandAmber";
        textClass += "text-brandAmber";
        break;
      case "danger":
        btnClass += "bg-alertRed border border-alertRed";
        textClass += "text-white";
        break;
    }
  }

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={btnClass}
    >
      <Text className={textClass}>{label}</Text>
    </Pressable>
  );
}

