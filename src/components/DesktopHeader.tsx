import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  ScrollView
} from "react-native";
import { SSALogo } from "./Branding/SSALogo";
import {
  Minus,
  Square,
  X,
  Sun,
  Moon,
  Layers,
  Store,
  Truck,
  Users,
  Share2,
  Info,
  LogOut
} from "lucide-react-native";

interface DesktopHeaderProps {
  isDark?: boolean;
  onToggleTheme?: () => void;
  onOpenAbout?: () => void;
  onSignOut?: () => void;
  activeSection?: "overview" | "ssc" | "ssm" | "ssd" | "referrals";
  onSelectSection?: (section: "overview" | "ssc" | "ssm" | "ssd" | "referrals") => void;
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  isDark = false,
  onToggleTheme,
  onOpenAbout,
  onSignOut,
  activeSection = "overview",
  onSelectSection
}) => {
  const { width } = useWindowDimensions();
  const isCompact = width < 900;

  const colors = isDark
    ? {
        bg: "#0B0F17",
        border: "#1E293B",
        textMain: "#F8FAFC",
        textSub: "#94A3B8",
        navHover: "#1E293B",
        accent: "#EA580C",
        badgeBg: "#2A1805"
      }
    : {
        bg: "#FFFFFF",
        border: "#E2E8F0",
        textMain: "#0F172A",
        textSub: "#64748B",
        navHover: "#F1F5F9",
        accent: "#EA580C",
        badgeBg: "#FFF7ED"
      };

  const navItems = [
    { key: "overview", label: "Overview", icon: Layers },
    { key: "ssc", label: "SSC (Consumer)", icon: Users },
    { key: "ssm", label: "SSM (Merchant)", icon: Store },
    { key: "ssd", label: "SSD (Delivery)", icon: Truck },
    { key: "referrals", label: "Referrals", icon: Share2 }
  ] as const;

  const renderNavButtons = () => (
    <>
      {navItems.map((item) => {
        const IconComponent = item.icon;
        const isActive = activeSection === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.navItem,
              isActive && {
                backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                borderColor: colors.accent
              }
            ]}
            onPress={() => onSelectSection && onSelectSection(item.key)}
            activeOpacity={0.7}
          >
            <IconComponent
              size={15}
              color={isActive ? colors.accent : colors.textSub}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.navText,
                { color: isActive ? colors.accent : colors.textSub }
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </>
  );

  return (
    <View style={[styles.rootContainer, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      {/* Main Top Header Bar */}
      <View style={styles.mainBar}>
        {/* 1. Left: Official SSA Logo & Brand Identity */}
        <View style={styles.leftSection}>
          <SSALogo layout="horizontal" size="small" variant={isDark ? "dark" : "light"} />
          <View style={[styles.pillBadge, { borderColor: colors.border, backgroundColor: colors.badgeBg }]}>
            <Text style={styles.pillText}>ADMIN</Text>
          </View>
        </View>

        {/* 2. Desktop-Only Center Nav (hidden on compact/mobile) */}
        {!isCompact && (
          <View style={styles.centerNav}>
            {renderNavButtons()}
          </View>
        )}

        {/* 3. Right: Status, About, Theme, Sign Out & Windows Controls */}
        <View style={styles.rightSection}>
          <View style={styles.onlineStatus}>
            <View style={styles.greenPulse} />
            <Text style={[styles.statusText, { color: colors.textSub }]}>Live DB</Text>
          </View>

          <TouchableOpacity
            style={[styles.iconButton, { borderColor: colors.border }]}
            onPress={onOpenAbout}
            accessibilityLabel="About SSA"
            activeOpacity={0.7}
          >
            <Info size={16} color={colors.textSub} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, { borderColor: colors.border }]}
            onPress={onToggleTheme}
            accessibilityLabel="Toggle Theme"
            activeOpacity={0.7}
          >
            {isDark ? (
              <Sun size={16} color="#F59E0B" />
            ) : (
              <Moon size={16} color="#64748B" />
            )}
          </TouchableOpacity>

          {onSignOut && (
            <TouchableOpacity
              style={[styles.iconButton, { borderColor: colors.border }]}
              onPress={onSignOut}
              accessibilityLabel="Sign Out"
              activeOpacity={0.7}
            >
              <LogOut size={16} color="#EF4444" />
            </TouchableOpacity>
          )}

          {/* Desktop Window Controls simulation on Windows desktop */}
          {!isCompact && Platform.OS === "windows" && (
            <View style={styles.windowControls}>
              <TouchableOpacity style={styles.windowBtn} activeOpacity={0.6}>
                <Minus size={13} color={colors.textSub} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.windowBtn} activeOpacity={0.6}>
                <Square size={11} color={colors.textSub} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.windowBtn, styles.closeBtn]} activeOpacity={0.6}>
                <X size={13} color={colors.textSub} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Compact / Mobile Navigation Bar (Horizontally scrollable) */}
      {isCompact && (
        <View style={[styles.compactNavContainer, { borderTopColor: colors.border }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.compactScrollContent}
          >
            {renderNavButtons()}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    borderBottomWidth: 1
  },
  mainBar: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16
  },
  compactNavContainer: {
    height: 44,
    borderTopWidth: 1,
    justifyContent: "center"
  },
  compactScrollContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center"
  },
  pillBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 10
  },
  pillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#EA580C",
    letterSpacing: 1
  },
  centerNav: {
    flexDirection: "row",
    alignItems: "center"
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
    marginHorizontal: 3
  },
  navText: {
    fontSize: 13,
    fontWeight: "700"
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center"
  },
  onlineStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8
  },
  greenPulse: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#16A34A",
    marginRight: 5
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600"
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6
  },
  windowControls: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: "#E2E8F0",
    paddingLeft: 6
  },
  windowBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4
  },
  closeBtn: {}
});
