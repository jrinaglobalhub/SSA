import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Text, Dimensions, ActivityIndicator } from "react-native";
import { SSALogo } from "../components/Branding/SSALogo";

interface SplashScreenProps {
  onFinish?: () => void;
  durationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  durationMs = 2000
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    // Smooth entry animation: fade in & gentle scale up
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true
      })
    ]).start();

    // Auto complete after duration
    const timer = setTimeout(() => {
      if (onFinish) onFinish();
    }, durationMs);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      {/* Centered Brand Logo */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <SSALogo layout="stacked" size="large" variant="light" />

        {/* Security / Clearance Badge */}
        <View style={styles.badgeContainer}>
          <View style={styles.statusDot} />
          <Text style={styles.badgeText}>SECURE ADMIN PORTAL • KERALA REGION</Text>
        </View>
      </Animated.View>

      {/* Bottom Footer & Loading Indicator */}
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#EA580C" style={styles.spinner} />
        <Text style={styles.footerBrand}>SmartShopper Ecosystem</Text>
        <Text style={styles.footerSub}>JRINA Private Limited • Private Release v1.0.0</Text>
      </View>
    </View>
  );
};

const { height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF", // Strictly Pure White Background
    justifyContent: "center",
    alignItems: "center"
  },
  content: {
    alignItems: "center",
    justifyContent: "center"
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#16A34A", // Green indicator
    marginRight: 8
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    letterSpacing: 1.2
  },
  footer: {
    position: "absolute",
    bottom: height * 0.06,
    alignItems: "center"
  },
  spinner: {
    marginBottom: 12
  },
  footerBrand: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: 0.8
  },
  footerSub: {
    fontSize: 11,
    fontWeight: "500",
    color: "#94A3B8",
    marginTop: 3
  }
});
