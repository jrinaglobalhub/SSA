import React from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from "react-native";
import { SSALogo } from "./Branding/SSALogo";
import { X, ShieldCheck, Database, Layers, CheckCircle } from "lucide-react-native";

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
  isDark?: boolean;
}

export const AboutModal: React.FC<AboutModalProps> = ({
  visible,
  onClose,
  isDark = false
}) => {
  const colors = isDark
    ? {
        cardBg: "#161E2E",
        textMain: "#F8FAFC",
        textSub: "#94A3B8",
        border: "#334155",
        badgeBg: "#1E293B"
      }
    : {
        cardBg: "#FFFFFF",
        textMain: "#0F172A",
        textSub: "#64748B",
        border: "#E2E8F0",
        badgeBg: "#F8FAFC"
      };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <X size={18} color={colors.textSub} />
          </TouchableOpacity>

          {/* SSA Wordmark Logo Header */}
          <View style={styles.logoContainer}>
            <SSALogo layout="stacked" size="large" variant={isDark ? "dark" : "light"} />
          </View>

          {/* Release Version & Clearance */}
          <View style={styles.specGrid}>
            <View style={[styles.specItem, { backgroundColor: colors.badgeBg, borderColor: colors.border }]}>
              <Text style={[styles.specLabel, { color: colors.textSub }]}>APPLICATION</Text>
              <Text style={[styles.specValue, { color: colors.textMain }]}>SmartShopper Admin (SSA)</Text>
            </View>

            <View style={[styles.specItem, { backgroundColor: colors.badgeBg, borderColor: colors.border }]}>
              <Text style={[styles.specLabel, { color: colors.textSub }]}>VERSION</Text>
              <Text style={[styles.specValue, { color: "#EA580C" }]}>v1.0.0 (Release)</Text>
            </View>

            <View style={[styles.specItem, { backgroundColor: colors.badgeBg, borderColor: colors.border }]}>
              <Text style={[styles.specLabel, { color: colors.textSub }]}>BRAND OWNER</Text>
              <Text style={[styles.specValue, { color: colors.textMain }]}>JRINA Private Limited</Text>
            </View>

            <View style={[styles.specItem, { backgroundColor: colors.badgeBg, borderColor: colors.border }]}>
              <Text style={[styles.specLabel, { color: colors.textSub }]}>TARGET PLATFORMS</Text>
              <Text style={[styles.specValue, { color: colors.textMain }]}>Android APK & Windows Desktop</Text>
            </View>

            <View style={[styles.specItem, { backgroundColor: colors.badgeBg, borderColor: colors.border }]}>
              <Text style={[styles.specLabel, { color: colors.textSub }]}>MANAGED ECOSYSTEMS</Text>
              <Text style={[styles.specValue, { color: colors.textMain }]}>SSC (Consumer) • SSM (Merchant) • SSD (Delivery)</Text>
            </View>

            <View style={[styles.specItem, { backgroundColor: colors.badgeBg, borderColor: colors.border }]}>
              <Text style={[styles.specLabel, { color: colors.textSub }]}>ACCESS LEVEL</Text>
              <Text style={[styles.specValue, { color: "#16A34A" }]}>Founder & Super Admin Restricted</Text>
            </View>
          </View>

          {/* Security Notice */}
          <View style={styles.securityBox}>
            <ShieldCheck size={16} color="#EA580C" style={{ marginRight: 8 }} />
            <Text style={styles.securityText}>
              All administrative operations across consumer profiles, merchant subscriptions, and delivery driver verification are strictly authenticated and audited.
            </Text>
          </View>

          {/* Action button */}
          <TouchableOpacity style={styles.doneButton} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.doneButtonText}>Close Specification</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8
  },
  closeBtn: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 8
  },
  specGrid: {
    marginTop: 8
  },
  specItem: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8
  },
  specLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 2
  },
  specValue: {
    fontSize: 13,
    fontWeight: "700"
  },
  securityBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FFEDD5",
    marginTop: 6,
    marginBottom: 20
  },
  securityText: {
    flex: 1,
    fontSize: 11,
    color: "#9A3412",
    lineHeight: 16,
    fontWeight: "500"
  },
  doneButton: {
    backgroundColor: "#EA580C",
    borderRadius: 10,
    height: 44,
    alignItems: "center",
    justifyContent: "center"
  },
  doneButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700"
  }
});
