import React from "react";
import { View, Text, StyleSheet, Image, ViewStyle } from "react-native";

export interface SSALogoProps {
  layout?: "horizontal" | "stacked" | "icon-only";
  variant?: "light" | "dark";
  size?: "small" | "medium" | "large";
  style?: ViewStyle;
}

export const SSALogo: React.FC<SSALogoProps> = ({
  layout = "horizontal",
  variant = "light",
  size = "medium",
  style
}) => {
  const isDark = variant === "dark";

  // Size dimensions
  const dimensions = {
    small: { icon: 32, ssaSize: 18, adminSize: 8, subtitleSize: 6, spacing: 8 },
    medium: { icon: 52, ssaSize: 26, adminSize: 10, subtitleSize: 8, spacing: 12 },
    large: { icon: 84, ssaSize: 42, adminSize: 15, subtitleSize: 11, spacing: 16 }
  }[size];

  if (layout === "icon-only") {
    return (
      <View style={[styles.iconWrapper, { width: dimensions.icon, height: dimensions.icon }, style]}>
        <Image
          source={require("../../../assets/icon-192.png")}
          style={{ width: dimensions.icon, height: dimensions.icon }}
          resizeMode="contain"
        />
      </View>
    );
  }

  if (layout === "stacked") {
    return (
      <View style={[styles.stackedContainer, style]}>
        <View style={[styles.iconBadge, { width: dimensions.icon * 1.5, height: dimensions.icon * 1.5 }]}>
          <Image
            source={require("../../../assets/icon-192.png")}
            style={{ width: dimensions.icon * 1.25, height: dimensions.icon * 1.25 }}
            resizeMode="contain"
          />
        </View>
        <Text style={[styles.ssaTitle, { fontSize: dimensions.ssaSize, color: isDark ? "#F8FAFC" : "#0F172A" }]}>
          SSA
        </Text>
        <Text style={[styles.adminSubtitle, { fontSize: dimensions.adminSize }]}>
          SMARTSHOPPER ADMIN
        </Text>
        <Text style={[styles.jrinaOwner, { fontSize: dimensions.subtitleSize }]}>
          JRINA PRIVATE LIMITED
        </Text>
      </View>
    );
  }

  // Horizontal layout (default for headers, desktop bar, navigation)
  return (
    <View style={[styles.horizontalContainer, style]}>
      <View style={[styles.iconBadgeHorizontal, { width: dimensions.icon, height: dimensions.icon }]}>
        <Image
          source={require("../../../assets/icon-192.png")}
          style={{ width: dimensions.icon * 0.85, height: dimensions.icon * 0.85 }}
          resizeMode="contain"
        />
      </View>
      <View style={[styles.textBlock, { marginLeft: dimensions.spacing }]}>
        <Text style={[styles.ssaTitleHorizontal, { fontSize: dimensions.ssaSize, color: isDark ? "#F8FAFC" : "#0F172A" }]}>
          SSA
        </Text>
        <Text style={[styles.adminSubtitleHorizontal, { fontSize: dimensions.adminSize }]}>
          SMARTSHOPPER ADMIN
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  horizontalContainer: {
    flexDirection: "row",
    alignItems: "center"
  },
  stackedContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12
  },
  iconWrapper: {
    alignItems: "center",
    justifyContent: "center"
  },
  iconBadge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9"
  },
  iconBadgeHorizontal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  textBlock: {
    justifyContent: "center"
  },
  ssaTitle: {
    fontWeight: "900",
    letterSpacing: 3,
    textAlign: "center"
  },
  ssaTitleHorizontal: {
    fontWeight: "900",
    letterSpacing: 2,
    lineHeight: 28
  },
  adminSubtitle: {
    fontWeight: "800",
    color: "#EA580C", // SmartShopper Orange
    letterSpacing: 2.5,
    marginTop: 4,
    textAlign: "center"
  },
  adminSubtitleHorizontal: {
    fontWeight: "800",
    color: "#EA580C",
    letterSpacing: 1.8,
    marginTop: 1
  },
  jrinaOwner: {
    fontWeight: "600",
    color: "#64748B",
    letterSpacing: 1.2,
    marginTop: 4,
    textAlign: "center"
  }
});
