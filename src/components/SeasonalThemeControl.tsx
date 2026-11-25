import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Sparkles,
  Sun,
  CloudRain,
  Snowflake,
  Gift,
  Calendar,
  Moon,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  Info
} from "lucide-react-native";
import {
  AdminApi,
  SeasonalThemeId,
  SeasonalThemeOverrideState
} from "../api/adminApi";
import { SEASONAL_THEMES, resolveSeasonalTheme } from "../theme/seasonalTheme";

interface SeasonalThemeControlProps {
  isDark?: boolean;
}

interface ThemeMeta {
  id: SeasonalThemeId;
  name: string;
  subtitle: string;
  icon: any;
  accentColor: string;
  badgeBg: string;
}

const THEME_OPTIONS: ThemeMeta[] = [
  {
    id: "normal",
    name: "Normal",
    subtitle: "Standard year-round SmartShopper theme",
    icon: Calendar,
    accentColor: "#EA580C",
    badgeBg: "#FFF7ED"
  },
  {
    id: "sunny",
    name: "Sunny / Summer",
    subtitle: "Summer season with warm solar tones (Mar 1 – May 31)",
    icon: Sun,
    accentColor: "#F59E0B",
    badgeBg: "#FFFBEB"
  },
  {
    id: "monsoon",
    name: "Monsoon + School Reopening",
    subtitle: "Fresh rain and school reopening theme (Jun 1 – Jun 30)",
    icon: CloudRain,
    accentColor: "#0284C7",
    badgeBg: "#F0F9FF"
  },
  {
    id: "ice",
    name: "Winter",
    subtitle: "Cool winter frost theme (Nov 20 – Dec 30)",
    icon: Snowflake,
    accentColor: "#0EA5E9",
    badgeBg: "#F0FDF4"
  },
  {
    id: "christmas_ice",
    name: "Christmas + Winter",
    subtitle: "Festive Christmas & winter holiday theme (Dec 24 – Dec 26)",
    icon: Gift,
    accentColor: "#DC2626",
    badgeBg: "#FEF2F2"
  },
  {
    id: "new_year",
    name: "New Year",
    subtitle: "Celebratory New Year festival theme (Dec 31 – Jan 5)",
    icon: Sparkles,
    accentColor: "#8B5CF6",
    badgeBg: "#F5F3FF"
  },
  {
    id: "ramadan",
    name: "Ramadan",
    subtitle: "Holy Ramadan month theme (Highest priority override)",
    icon: Moon,
    accentColor: "#D97706",
    badgeBg: "#FFFBEB"
  }
];

export const SeasonalThemeControl: React.FC<SeasonalThemeControlProps> = ({ isDark = false }) => {
  const [config, setConfig] = useState<SeasonalThemeOverrideState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [applying, setApplying] = useState<boolean>(false);
  const [selectedTheme, setSelectedTheme] = useState<SeasonalThemeId>("normal");
  const [adminRole, setAdminRole] = useState<string>("super_admin");
  const [adminEmail, setAdminEmail] = useState<string>("founder@jrina.online");
  const [confirmModal, setConfirmModal] = useState<"apply_manual" | "return_auto" | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // 1. Verify Founder / Super Admin clearance
  useEffect(() => {
    async function checkRole() {
      try {
        const storedRole = await AsyncStorage.getItem("@ssa_admin_role");
        const storedEmail = await AsyncStorage.getItem("@ssa_admin_email");
        if (storedRole) setAdminRole(storedRole);
        if (storedEmail) setAdminEmail(storedEmail);
      } catch {}
    }
    checkRole();
  }, []);

  const isFounderSuperAdmin = useMemo(() => {
    const roleLower = adminRole.toLowerCase();
    const emailLower = adminEmail.toLowerCase();
    return (
      roleLower === "super_admin" ||
      roleLower === "founder" ||
      emailLower.includes("founder") ||
      emailLower.includes("info@jrina.online") ||
      emailLower.includes("jrinaglobalhub") ||
      emailLower.includes("jrina")
    );
  }, [adminRole, adminEmail]);

  // 2. Fetch Theme Config & Subscribe to Realtime
  useEffect(() => {
    if (!isFounderSuperAdmin) return;

    let isMounted = true;
    async function loadConfig() {
      setLoading(true);
      const res = await AdminApi.getSeasonalThemeConfig();
      if (isMounted) {
        setConfig(res);
        if (res.mode === "manual" && res.manualThemeId) {
          setSelectedTheme(res.manualThemeId);
        } else {
          setSelectedTheme(res.appliedThemeId);
        }
        setLoading(false);
      }
    }
    loadConfig();

    const unsubscribe = AdminApi.subscribeToSeasonalThemeConfig((newCfg) => {
      if (isMounted) {
        setConfig(newCfg);
        if (newCfg.mode === "manual" && newCfg.manualThemeId) {
          setSelectedTheme(newCfg.manualThemeId);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [isFounderSuperAdmin]);

  // If user is NOT Founder / Super Admin, strictly hide this control panel
  if (!isFounderSuperAdmin) {
    return null;
  }

  const colors = isDark
    ? {
        cardBg: "#161E2E",
        cardBorder: "#1E293B",
        textMain: "#F8FAFC",
        textSub: "#94A3B8",
        accent: "#EA580C",
        itemBg: "#0F172A",
        itemBorder: "#334155",
        modalOverlay: "rgba(0, 0, 0, 0.75)"
      }
    : {
        cardBg: "#FFFFFF",
        cardBorder: "#E2E8F0",
        textMain: "#0F172A",
        textSub: "#64748B",
        accent: "#EA580C",
        itemBg: "#F8FAFC",
        itemBorder: "#E2E8F0",
        modalOverlay: "rgba(15, 23, 42, 0.6)"
      };

  const autoDetected = config?.autoDetectedTheme || resolveSeasonalTheme().id;
  const currentMode = config?.mode || "automatic";
  const activeThemeId = config?.appliedThemeId || autoDetected;
  const activeMeta = THEME_OPTIONS.find((t) => t.id === activeThemeId) || THEME_OPTIONS[0];
  const autoMeta = THEME_OPTIONS.find((t) => t.id === autoDetected) || THEME_OPTIONS[0];
  const selectedMeta = THEME_OPTIONS.find((t) => t.id === selectedTheme) || THEME_OPTIONS[0];

  const handleApplyManualTheme = async () => {
    setApplying(true);
    setFeedback(null);
    setConfirmModal(null);

    const res = await AdminApi.setSeasonalThemeOverride({
      mode: "manual",
      themeId: selectedTheme,
      adminEmail,
      adminId: "founder_super_admin",
      reason: `Manual seasonal theme override to ${selectedTheme} by Founder`
    });

    setApplying(false);
    if (res.success) {
      setFeedback({
        type: "success",
        message: `Manual theme override active: "${selectedMeta.name}" is now live across SmartShopper.`
      });
      if (res.activeTheme) {
        setConfig((prev) =>
          prev
            ? {
                ...prev,
                mode: "manual",
                appliedThemeId: res.activeTheme!,
                manualThemeId: res.activeTheme!,
                updatedAt: new Date().toISOString()
              }
            : null
        );
      }
    } else {
      setFeedback({
        type: "error",
        message: res.error || "Failed to apply manual theme override."
      });
    }
  };

  const handleReturnToAuto = async () => {
    setApplying(true);
    setFeedback(null);
    setConfirmModal(null);

    const res = await AdminApi.setSeasonalThemeOverride({
      mode: "automatic",
      adminEmail,
      adminId: "founder_super_admin",
      reason: "Restored automatic seasonal date schedule by Founder"
    });

    setApplying(false);
    if (res.success) {
      setFeedback({
        type: "success",
        message: `Returned to Automatic Mode. Active theme restored to "${autoMeta.name}" based on date schedule.`
      });
      if (res.activeTheme) {
        setSelectedTheme(res.activeTheme);
        setConfig((prev) =>
          prev
            ? {
                ...prev,
                mode: "automatic",
                appliedThemeId: res.activeTheme!,
                manualThemeId: null,
                updatedAt: new Date().toISOString()
              }
            : null
        );
      }
    } else {
      setFeedback({
        type: "error",
        message: res.error || "Failed to return to automatic mode."
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
      {/* Header with Founder Clearance Badge */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconBox, { backgroundColor: "#FFF7ED" }]}>
            <Sparkles size={20} color="#EA580C" />
          </View>
          <View style={{ marginLeft: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={[styles.title, { color: colors.textMain }]}>Season Theme Control</Text>
              <View style={styles.founderBadge}>
                <ShieldCheck size={12} color="#16A34A" />
                <Text style={styles.founderBadgeText}>Founder / Super Admin Only</Text>
              </View>
            </View>
            <Text style={[styles.subtitle, { color: colors.textSub }]}>
              Control active seasonal themes across SmartShopper clients with instant synchronization
            </Text>
          </View>
        </View>

        {/* Current Mode Badge */}
        <View
          style={[
            styles.modeBadge,
            currentMode === "manual"
              ? { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" }
              : { backgroundColor: "#F0FDF4", borderColor: "#86EFAC" }
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: currentMode === "manual" ? "#DC2626" : "#16A34A" }
            ]}
          />
          <Text
            style={[
              styles.modeBadgeText,
              { color: currentMode === "manual" ? "#DC2626" : "#16A34A" }
            ]}
          >
            {currentMode === "manual" ? "Manual Override Active" : "Automatic Mode (Default)"}
          </Text>
        </View>
      </View>

      {/* Loading Indicator */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSub }]}>Fetching seasonal theme status...</Text>
        </View>
      ) : (
        <>
          {/* Status Summary Banner */}
          <View style={[styles.summaryGrid, { borderColor: colors.itemBorder, backgroundColor: colors.itemBg }]}>
            {/* 1. Active Live Theme */}
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryLabel, { color: colors.textSub }]}>Currently Active Theme</Text>
              <View style={styles.activePillRow}>
                <View style={[styles.themeColorChip, { backgroundColor: activeMeta.accentColor }]} />
                <Text style={[styles.summaryValue, { color: colors.textMain }]}>{activeMeta.name}</Text>
              </View>
              <Text style={[styles.summaryCaption, { color: colors.textSub }]} numberOfLines={1}>
                {currentMode === "manual" ? "Manually forced override" : "Calculated from seasonal schedule"}
              </Text>
            </View>

            {/* 2. Detected Automatic Season */}
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryLabel, { color: colors.textSub }]}>Automatic Date Season</Text>
              <View style={styles.activePillRow}>
                <Calendar size={15} color="#2563EB" />
                <Text style={[styles.summaryValue, { color: colors.textMain, marginLeft: 6 }]}>
                  {autoMeta.name}
                </Text>
              </View>
              <Text style={[styles.summaryCaption, { color: colors.textSub }]} numberOfLines={1}>
                Asia/Kolkata date & priority engine
              </Text>
            </View>

            {/* 3. Manual Override Status */}
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryLabel, { color: colors.textSub }]}>Manual Selection</Text>
              <Text style={[styles.summaryValue, { color: colors.textMain }]}>
                {config?.manualThemeId
                  ? THEME_OPTIONS.find((t) => t.id === config.manualThemeId)?.name
                  : "None (Automatic)"}
              </Text>
              <Text style={[styles.summaryCaption, { color: colors.textSub }]} numberOfLines={1}>
                Updated by: {config?.updatedBy || "System"}
              </Text>
            </View>
          </View>

          {/* Feedback message */}
          {feedback && (
            <View
              style={[
                styles.feedbackBox,
                feedback.type === "success"
                  ? { backgroundColor: "#F0FDF4", borderColor: "#86EFAC" }
                  : { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" }
              ]}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 size={16} color="#16A34A" />
              ) : (
                <AlertCircle size={16} color="#DC2626" />
              )}
              <Text
                style={[
                  styles.feedbackText,
                  { color: feedback.type === "success" ? "#15803D" : "#B91C1C" }
                ]}
              >
                {feedback.message}
              </Text>
            </View>
          )}

          {/* Theme Selector Section */}
          <View style={styles.selectorSection}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionHeading, { color: colors.textMain }]}>Select Seasonal Theme</Text>
              <Text style={[styles.sectionHeadingHint, { color: colors.textSub }]}>
                Choose any theme to test or deploy manual override across SmartShopper
              </Text>
            </View>

            <View style={styles.themesGrid}>
              {THEME_OPTIONS.map((theme) => {
                const IconComponent = theme.icon;
                const isSelected = selectedTheme === theme.id;
                const isLive = activeThemeId === theme.id;

                return (
                  <TouchableOpacity
                    key={theme.id}
                    style={[
                      styles.themeCard,
                      {
                        backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
                        borderColor: isSelected ? theme.accentColor : colors.itemBorder
                      },
                      isSelected && {
                        borderWidth: 2,
                        backgroundColor: isDark ? "#1E293B" : "#FFF7ED"
                      }
                    ]}
                    onPress={() => setSelectedTheme(theme.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.themeCardTop}>
                      <View style={[styles.themeIconWrapper, { backgroundColor: theme.accentColor + "15" }]}>
                        <IconComponent size={18} color={theme.accentColor} />
                      </View>
                      <View style={styles.badgesCol}>
                        {isLive && (
                          <View style={styles.liveBadge}>
                            <Text style={styles.liveBadgeText}>LIVE</Text>
                          </View>
                        )}
                        {theme.id === autoDetected && (
                          <View style={styles.autoBadge}>
                            <Text style={styles.autoBadgeText}>SCHEDULED</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <Text style={[styles.themeCardName, { color: colors.textMain }]}>{theme.name}</Text>
                    <Text style={[styles.themeCardDesc, { color: colors.textSub }]} numberOfLines={2}>
                      {theme.subtitle}
                    </Text>

                    {/* Color Preview Bar */}
                    <View style={styles.colorPreviewRow}>
                      <View
                        style={[
                          styles.colorDot,
                          { backgroundColor: SEASONAL_THEMES[theme.id]?.accentTint || theme.accentColor }
                        ]}
                      />
                      <Text style={[styles.colorCodeText, { color: colors.textSub }]}>
                        {SEASONAL_THEMES[theme.id]?.accentTint || theme.accentColor}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Action Bar */}
          <View style={[styles.actionBar, { borderColor: colors.itemBorder }]}>
            <View style={styles.actionInfo}>
              <Info size={16} color={colors.textSub} />
              <Text style={[styles.actionInfoText, { color: colors.textSub }]}>
                Selected: <Text style={{ fontWeight: "700", color: colors.textMain }}>{selectedMeta.name}</Text>
                {currentMode === "manual" && activeThemeId === selectedTheme
                  ? " (Currently Applied)"
                  : ""}
              </Text>
            </View>

            <View style={styles.actionButtons}>
              {/* Return to Automatic Mode Button */}
              {currentMode === "manual" && (
                <TouchableOpacity
                  style={[styles.returnAutoBtn, { borderColor: colors.itemBorder }]}
                  onPress={() => setConfirmModal("return_auto")}
                  disabled={applying}
                  activeOpacity={0.7}
                >
                  <RotateCcw size={15} color="#2563EB" />
                  <Text style={styles.returnAutoBtnText}>Return to Automatic Mode</Text>
                </TouchableOpacity>
              )}

              {/* Apply Manual Theme Button */}
              <TouchableOpacity
                style={[
                  styles.applyBtn,
                  applying && { opacity: 0.7 },
                  currentMode === "manual" && activeThemeId === selectedTheme && {
                    backgroundColor: "#16A34A"
                  }
                ]}
                onPress={() => setConfirmModal("apply_manual")}
                disabled={applying}
                activeOpacity={0.8}
              >
                {applying ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <CheckCircle2 size={16} color="#FFFFFF" />
                    <Text style={styles.applyBtnText}>
                      {currentMode === "manual" && activeThemeId === selectedTheme
                        ? "Re-apply Theme"
                        : "Apply Manual Theme"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {/* Confirmation Modal */}
      <Modal
        visible={confirmModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal(null)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View
                style={[
                  styles.modalIconBox,
                  { backgroundColor: confirmModal === "apply_manual" ? "#FFF7ED" : "#EFF6FF" }
                ]}
              >
                {confirmModal === "apply_manual" ? (
                  <AlertTriangle size={24} color="#EA580C" />
                ) : (
                  <RotateCcw size={24} color="#2563EB" />
                )}
              </View>
              <Text style={[styles.modalTitle, { color: colors.textMain }]}>
                {confirmModal === "apply_manual"
                  ? "Confirm Manual Theme Override"
                  : "Restore Automatic Seasonal Theme?"}
              </Text>
            </View>

            <Text style={[styles.modalDescription, { color: colors.textSub }]}>
              {confirmModal === "apply_manual" ? (
                <>
                  You are about to manually force the seasonal theme to{" "}
                  <Text style={{ fontWeight: "700", color: colors.textMain }}>
                    "{selectedMeta.name}"
                  </Text>
                  . This will immediately apply across all SmartShopper clients (Home screen, header, deals, search, carousels, and footer).
                  {"\n\n"}
                  Manual mode will remain active until you explicitly return to Automatic Mode.
                </>
              ) : (
                <>
                  This will deactivate manual override and restore SmartShopper's automatic seasonal schedule.
                  {"\n\n"}
                  The active theme will immediately recalculate to{" "}
                  <Text style={{ fontWeight: "700", color: colors.textMain }}>
                    "{autoMeta.name}"
                  </Text>{" "}
                  based on the Asia/Kolkata date calendar without requiring app restarts.
                </>
              )}
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.itemBorder }]}
                onPress={() => setConfirmModal(null)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.textSub }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  { backgroundColor: confirmModal === "apply_manual" ? "#EA580C" : "#2563EB" }
                ]}
                onPress={() => {
                  if (confirmModal === "apply_manual") {
                    handleApplyManualTheme();
                  } else {
                    handleReturnToAuto();
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalConfirmBtnText}>
                  {confirmModal === "apply_manual" ? "Yes, Apply Theme" : "Yes, Restore Automatic"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 280
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.2
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2
  },
  founderBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4
  },
  founderBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#16A34A"
  },
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  modeBadgeText: {
    fontSize: 12,
    fontWeight: "800"
  },
  loadingBox: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "600"
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 16,
    marginBottom: 18
  },
  summaryCol: {
    flex: 1,
    minWidth: 160
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  activePillRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4
  },
  themeColorChip: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "800"
  },
  summaryCaption: {
    fontSize: 11,
    marginTop: 2
  },
  feedbackBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    marginBottom: 16
  },
  feedbackText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1
  },
  selectorSection: {
    marginBottom: 16
  },
  sectionTitleRow: {
    marginBottom: 12
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "800"
  },
  sectionHeadingHint: {
    fontSize: 11,
    marginTop: 2
  },
  themesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  themeCard: {
    flex: 1,
    minWidth: 180,
    maxWidth: 240,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1
  },
  themeCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8
  },
  themeIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  badgesCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  liveBadge: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  autoBadge: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  autoBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#2563EB"
  },
  themeCardName: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 4
  },
  themeCardDesc: {
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 8,
    minHeight: 30
  },
  colorPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  colorCodeText: {
    fontSize: 10,
    fontFamily: "monospace"
  },
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1
  },
  actionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  actionInfoText: {
    fontSize: 13
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  returnAutoBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    backgroundColor: "transparent"
  },
  returnAutoBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB"
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EA580C",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6
  },
  applyBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20
  },
  modalCard: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14
  },
  modalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    flex: 1
  },
  modalDescription: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: "700"
  },
  modalConfirmBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8
  },
  modalConfirmBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF"
  }
});
