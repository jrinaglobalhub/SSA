import React from "react";
import { View, Image, StyleSheet, ViewStyle } from "react-native";

export interface SSAIconProps {
  size?: number;
  withBackground?: boolean;
  style?: ViewStyle;
}

export const SSAIcon: React.FC<SSAIconProps> = ({
  size = 48,
  withBackground = true,
  style
}) => {
  return (
    <View
      style={[
        styles.container,
        { width: size, height: size },
        withBackground && styles.whiteBg,
        style
      ]}
    >
      <Image
        source={require("../../../assets/icon-192.png")}
        style={{ width: size * 0.75, height: size * 0.75 }}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center"
  },
  whiteBg: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  }
});
