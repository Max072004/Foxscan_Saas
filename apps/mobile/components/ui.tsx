import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function Screen({ children }: { children: ReactNode }) {
  return <View className="flex-1 bg-offWhite px-5 pt-6">{children}</View>;
}

interface TitleProps {
  children: ReactNode;
  eyebrow?: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function Title({ children, eyebrow, subtitle, icon }: TitleProps) {
  return (
    <View className="mb-5 flex-row items-start justify-between">
      <View className="flex-1 pr-3">
        {eyebrow ? (
          <Text className="text-brandAmber text-[11px] font-extrabold uppercase tracking-[1.5px] mb-1">
            {eyebrow}
          </Text>
        ) : null}
        <Text className="text-2xl font-extrabold text-brandCharcoal tracking-tight">
          {children}
        </Text>
        {subtitle ? (
          <Text className="text-slate-400 text-sm font-semibold mt-1 leading-relaxed">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {icon ? (
        <View className="w-11 h-11 rounded-2xl bg-brandAmber/12 border border-brandAmber/20 items-center justify-center">
          <Ionicons name={icon} size={20} color="#EAAC1F" />
        </View>
      ) : null}
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Text className="text-[12px] font-extrabold text-slate-400 uppercase tracking-[1px] mb-3">
      {children}
    </Text>
  );
}

export function EmptyState({
  icon = "file-tray-outline",
  title,
  subtitle,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}) {
  return (
    <View className="rounded-2xl border border-dashed border-slate-200 bg-white/60 items-center justify-center py-12 px-6 mb-4">
      <View className="w-14 h-14 rounded-2xl bg-slate-100 items-center justify-center mb-3">
        <Ionicons name={icon} size={26} color="#94A3B8" />
      </View>
      <Text className="text-brandCharcoal font-bold text-sm text-center">{title}</Text>
      {subtitle ? (
        <Text className="text-slate-400 text-sm font-semibold text-center mt-1.5 leading-relaxed max-w-[240px]">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <View className="rounded-2xl border border-slate-200/60 bg-white p-5 mb-4 shadow-[0_4px_16px_rgba(26,29,36,0.055)]">
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
    switch (variant) {
      case "primary":
        btnClass += "bg-brandAmber/40 border border-brandAmber/10";
        textClass += "text-brandCharcoal/45 font-extrabold";
        break;
      case "secondary":
        btnClass += "bg-brandCharcoal/40 border border-brandCharcoal/10";
        textClass += "text-white/45";
        break;
      case "outline":
        btnClass += "bg-transparent border border-brandAmber/30";
        textClass += "text-brandAmber/30";
        break;
      case "danger":
        btnClass += "bg-alertRed/40 border border-alertRed/10";
        textClass += "text-white/45";
        break;
      default:
        btnClass += "bg-slate-200 border border-slate-200";
        textClass += "text-slate-400";
    }
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

