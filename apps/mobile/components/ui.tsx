import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Pressable,
  Text,
  View,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  useColorScheme,
  TextInput,
  type TextInputProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

/* ─── helpers ─── */
export function useTheme() {
  const isDark = useColorScheme() === "dark";
  return {
    isDark,
    bg: isDark ? "#101218" : "#F8FAFC",
    card: isDark ? "#181B22" : "#FFFFFF",
    cardBorder: isDark ? "#272C38" : "#E2E8F0",
    text: isDark ? "#FFFFFF" : "#0F172A",
    textSecondary: isDark ? "#94A3B8" : "#64748B",
    textMuted: isDark ? "#64748B" : "#94A3B8",
    inputBg: isDark ? "#101218" : "#F1F5F9",
    inputBorder: isDark ? "#272C38" : "#CBD5E1",
    inputFocusBorder: "#F5B81F",
    accent: "#F5B81F",
    success: "#22C55E",
    danger: "#EF4444",
  };
}

/* ─── Screen ─── */
interface ScreenProps {
  children: ReactNode;
  dismissKeyboardOnTap?: boolean;
  scroll?: boolean;
}

export function Screen({ children, dismissKeyboardOnTap = true, scroll = false }: ScreenProps) {
  const { bg } = useTheme();
  const insets = useSafeAreaInsets();

  // When used inside a ScrollView, don't use flex:1 — it collapses to 0 height.
  // Only use flex:1 when the Screen is the top-level container.
  const content = (
    <View
      style={{
        flexGrow: scroll ? undefined : 1,
        minHeight: scroll ? undefined : "100%",
        backgroundColor: bg,
        paddingTop: scroll ? 12 : Math.max(insets.top, 12),
        paddingBottom: scroll ? 12 : Math.max(insets.bottom, 12),
      }}
    >
      <View style={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}>
        {children}
      </View>
    </View>
  );

  if (dismissKeyboardOnTap) {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        {content}
      </TouchableWithoutFeedback>
    );
  }
  return content;
}

/* ─── Title ─── */
interface TitleProps {
  children: ReactNode;
  eyebrow?: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function Title({ children, eyebrow, subtitle, icon }: TitleProps) {
  const { isDark } = useTheme();
  const titleColor = isDark ? "#FFFFFF" : "#0F172A";
  const subtitleColor = isDark ? "#94A3B8" : "#64748B";

  return (
    <View style={{ marginBottom: 24, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        {eyebrow ? (
          <Text style={{ color: "#F5B81F", fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>
            {eyebrow}
          </Text>
        ) : null}
        <Text style={{ fontSize: 28, fontWeight: "900", color: titleColor, letterSpacing: -0.5 }}>
          {children}
        </Text>
        {subtitle ? (
          <Text style={{ color: subtitleColor, fontSize: 14, fontWeight: "500", marginTop: 4, lineHeight: 20 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {icon ? (
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(245,184,31,0.15)", borderWidth: 1, borderColor: "rgba(245,184,31,0.3)", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={icon} size={22} color="#F5B81F" />
        </View>
      ) : null}
    </View>
  );
}

/* ─── SectionLabel ─── */
export function SectionLabel({ children }: { children: ReactNode }) {
  const { textSecondary } = useTheme();
  return (
    <Text style={{ fontSize: 11, fontWeight: "900", color: textSecondary, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12, marginTop: 8 }}>
      {children}
    </Text>
  );
}

/* ─── EmptyState ─── */
export function EmptyState({
  icon = "file-tray-outline",
  title,
  subtitle,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}) {
  const t = useTheme();
  return (
    <View style={{ borderRadius: 24, borderWidth: 1, borderStyle: "dashed", borderColor: t.cardBorder, backgroundColor: t.card, alignItems: "center", justifyContent: "center", paddingVertical: 48, paddingHorizontal: 24, marginBottom: 20 }}>
      <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: t.inputBg, alignItems: "center", justifyContent: "center", marginBottom: 12, borderWidth: 1, borderColor: t.cardBorder }}>
        <Ionicons name={icon} size={28} color={t.textSecondary} />
      </View>
      <Text style={{ color: t.text, fontWeight: "900", fontSize: 16, textAlign: "center" }}>{title}</Text>
      {subtitle ? (
        <Text style={{ color: t.textSecondary, fontSize: 14, fontWeight: "500", textAlign: "center", marginTop: 6, lineHeight: 20, maxWidth: 260 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

/* ─── Card ─── */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  const t = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [fadeAnim]);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: t.cardBorder,
        backgroundColor: t.card,
        padding: 20,
        marginBottom: 16,
      }}
    >
      {children}
    </Animated.View>
  );
}

/* ─── Skeleton ─── */
export function Skeleton({ height = 48, className = "" }: { height?: number; className?: string }) {
  const t = useTheme();
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.9, duration: 650, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={{
        height,
        opacity: pulseAnim,
        backgroundColor: t.inputBg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: t.cardBorder,
        marginBottom: 12,
      }}
    />
  );
}

/* ─── InputField ─── */
interface InputFieldProps extends TextInputProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  onClear?: () => void;
}

export function InputField({
  label,
  icon,
  error,
  onClear,
  value,
  placeholder,
  editable = true,
  ...props
}: InputFieldProps) {
  const t = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={{ marginBottom: 16 }}>
      {label ? (
        <Text style={{ fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, color: t.isDark ? "#CBD5E1" : "#475569" }}>
          {label}
        </Text>
      ) : null}
      <View
        style={{
          height: 56,
          borderWidth: 2,
          borderRadius: 16,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: t.inputBg,
          borderColor: error ? t.danger : isFocused ? t.inputFocusBorder : t.inputBorder,
        }}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={20}
            color={isFocused ? "#F5B81F" : t.textMuted}
            style={{ marginRight: 10 }}
          />
        ) : null}
        <TextInput
          value={value}
          editable={editable}
          placeholder={placeholder}
          placeholderTextColor={t.textMuted}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{
            flex: 1,
            color: t.text,
            fontSize: 16,
            fontWeight: "600",
            height: "100%",
          }}
          {...props}
        />
        {value && onClear && editable ? (
          <Pressable onPress={onClear} style={{ padding: 4 }}>
            <Ionicons name="close-circle" size={18} color={t.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={{ color: t.danger, fontSize: 12, fontWeight: "700", marginTop: 6, marginLeft: 4 }}>{error}</Text> : null}
    </View>
  );
}

/* ─── Button ─── */
interface ButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "outline" | "danger";
  icon?: keyof typeof Ionicons.glyphMap;
}

export function Button({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
  icon,
}: ButtonProps) {
  const t = useTheme();
  const isDisable = disabled || loading;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!isDisable) {
      Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
    }
  };

  const handlePressOut = () => {
    if (!isDisable) {
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start();
    }
  };

  let bgColor: string;
  let textColor: string;
  let borderColor: string;
  let spinnerColor: string;

  switch (variant) {
    case "primary":
      bgColor = isDisable ? "rgba(245,184,31,0.4)" : "#F5B81F";
      textColor = "#0F172A";
      borderColor = isDisable ? "rgba(245,184,31,0.2)" : "#F5B81F";
      spinnerColor = "#0F172A";
      break;
    case "secondary":
      bgColor = isDisable ? (t.isDark ? "#222733" : "#E2E8F0") : (t.isDark ? "#222733" : "#0F172A");
      textColor = isDisable ? t.textSecondary : "#FFFFFF";
      borderColor = t.isDark ? "#2D3445" : (isDisable ? "#CBD5E1" : "#0F172A");
      spinnerColor = "#FFFFFF";
      break;
    case "outline":
      bgColor = "transparent";
      textColor = isDisable ? "rgba(245,184,31,0.4)" : "#F5B81F";
      borderColor = isDisable ? "rgba(245,184,31,0.3)" : "#F5B81F";
      spinnerColor = "#F5B81F";
      break;
    case "danger":
      bgColor = isDisable ? "rgba(239,68,68,0.3)" : "#EF4444";
      textColor = "#FFFFFF";
      borderColor = isDisable ? "rgba(239,68,68,0.2)" : "#EF4444";
      spinnerColor = "#FFFFFF";
      break;
    default:
      bgColor = "#F5B81F";
      textColor = "#0F172A";
      borderColor = "#F5B81F";
      spinnerColor = "#0F172A";
  }

  return (
    <Pressable
      disabled={isDisable}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          height: 56,
          borderRadius: 16,
          paddingHorizontal: 24,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bgColor,
          borderWidth: variant === "outline" ? 2 : 1,
          borderColor: borderColor,
        }}
      >
        {loading ? (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <ActivityIndicator size="small" color={spinnerColor} />
            <Text style={{ fontWeight: "900", fontSize: 16, textAlign: "center", color: textColor, marginLeft: 10 }}>Processing...</Text>
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {icon ? (
              <Ionicons name={icon} size={20} color={textColor} style={{ marginRight: 8 }} />
            ) : null}
            <Text style={{ fontWeight: "900", fontSize: 16, textAlign: "center", color: textColor }}>{label}</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}
