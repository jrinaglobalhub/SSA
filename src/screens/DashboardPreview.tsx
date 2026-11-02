import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { DesktopHeader } from "../components/DesktopHeader";
import { OverviewScreen } from "./OverviewScreen";
import { SscScreen } from "./SscScreen";
import { SsmScreen } from "./SsmScreen";
import { SsdScreen } from "./SsdScreen";
import { ReferralsScreen } from "./ReferralsScreen";

interface DashboardPreviewProps {
  isDark?: boolean;
  onToggleTheme?: () => void;
  onOpenAbout?: () => void;
  onSignOut?: () => void;
}

export const DashboardPreview: React.FC<DashboardPreviewProps> = ({
  isDark = false,
  onToggleTheme,
  onOpenAbout,
  onSignOut
}) => {
  const [activeSection, setActiveSection] = useState<"overview" | "ssc" | "ssm" | "ssd" | "referrals">("overview");

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#0B0F17" : "#F8FAFC" }]}>
      {/* 1. Header with Section Switcher & SSA Branding */}
      <DesktopHeader
        isDark={isDark}
        onToggleTheme={onToggleTheme}
        onOpenAbout={onOpenAbout}
        onSignOut={onSignOut}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
      />

      {/* 2. Active Screen Content */}
      <View style={styles.screenContent}>
        {activeSection === "overview" && (
          <OverviewScreen
            isDark={isDark}
            onNavigateToSection={setActiveSection}
          />
        )}

        {activeSection === "ssc" && <SscScreen isDark={isDark} />}

        {activeSection === "ssm" && <SsmScreen isDark={isDark} />}

        {activeSection === "ssd" && <SsdScreen isDark={isDark} />}

        {activeSection === "referrals" && <ReferralsScreen isDark={isDark} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  screenContent: {
    flex: 1
  }
});
