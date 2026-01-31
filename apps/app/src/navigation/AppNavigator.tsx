import * as React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Colors, Typography, BorderRadius, Spacing } from '../theme/theme';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CampaignsScreen } from '../features/campaigns/CampaignsScreen';
import { CampaignDetailScreen } from '../features/campaigns/CampaignDetailScreen';
import { SponsorMissionScreen } from '../features/campaigns/SponsorMissionScreen';
import { SubmitProofScreen } from '../features/submissions/SubmitProofScreen';
import { FaceVerificationScreen } from '../features/face-verification/FaceVerificationScreen';
import { ValidateQueueScreen } from '../features/validation/ValidateQueueScreen';
import { MySubmissionsScreen } from '../features/submissions/MySubmissionsScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { LeaderboardScreen } from '../features/leaderboard/LeaderboardScreen';
import { LotteryScreen } from '../features/lottery/LotteryScreen';
import { DonationsScreen } from '../features/donations/DonationsScreen';
import { DonateHomeScreen } from '../features/donations/DonateHomeScreen';
import { CreateQuestScreen } from '../features/donations/CreateQuestScreen';
import { DonateQuestListScreen } from '../features/donations/DonateQuestListScreen';
import { DonateToQuestScreen } from '../features/donations/DonateToQuestScreen';
import { DailyTaskSelectionScreen } from '../features/tasks/DailyTaskSelectionScreen';
import { DailyTaskCameraScreen } from '../features/tasks/DailyTaskCameraScreen';
import { DonatorImpactDashboardScreen } from '../features/donations/DonatorImpactDashboardScreen';

import { TreasureWalletScreen } from '../features/wallet/TreasureWalletScreen';
import { RedeemChallengesScreen } from '../features/wallet/RedeemChallengesScreen';
import { PlayTicketResultScreen } from '../features/wallet/PlayTicketResultScreen';
import { RewardsCelebrationScreen } from '../features/rewards/RewardsCelebrationScreen';

export type AppStackParamList = {
  DonateHome: undefined;
  CreateQuest: undefined;
  DonateQuestList: undefined;
  DonateToQuest: { campaignId: string };
  Campaigns: undefined;
  CampaignDetail: { campaignId: string };
  SponsorMission: { campaignId: string };
  FaceVerification: { campaignId: string; checkpointId: string };
  SubmitProof: { campaignId: string; checkpointId: string };
  ValidateQueue: undefined;
  MySubmissions: undefined;
  Profile: undefined;
  Leaderboard: undefined;
  Lottery: { campaignId: string };
  DailyTaskSelection: undefined;
  DailyTaskCamera: undefined;
  DonatorImpactDashboard: undefined;
  TreasureWallet: undefined;
  RedeemChallenges: undefined;
  PlayTicketResult: { won: boolean; prize?: string; emoji?: string; challengeName: string };
  RewardsCelebration: { total?: number; balance?: number; breakdown?: { label: string; value: string }[] } | undefined;
};

export type TabParamList = {
  QuestsTab: undefined;
  DonateTab: undefined;
  ValidateTab: undefined;
  WalletTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

const TAB_ICON_SIZE = 22;
const tabIconStyle = { fontSize: TAB_ICON_SIZE };

function TabIcon({ color, emoji }: { color: string; emoji: string }) {
  return <Text style={[tabIconStyle, { color }]}>{emoji}</Text>;
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const activeColor = Colors.white;
  const inactiveColor = Colors.textGray;
  return (
    <View style={styles.tabBarStyle}>
      <View style={styles.tabBarRow}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const labelText = options.title ?? route.name;
          const iconColor = focused ? activeColor : inactiveColor;
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };
          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? labelText}
              onPress={onPress}
              style={styles.tabButton}
              activeOpacity={0.7}
            >
              <View style={[styles.tabItemInner, focused && styles.tabItemInnerActive]}>
                {options.tabBarIcon?.({
                  focused,
                  color: iconColor,
                  size: TAB_ICON_SIZE,
                })}
                <Text
                  style={[
                    styles.tabLabel,
                    { color: iconColor },
                    focused && styles.tabLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {labelText}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function DonateStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DonateHome" component={DonateHomeScreen} />
      <Stack.Screen name="CreateQuest" component={CreateQuestScreen} />
      <Stack.Screen name="DonateQuestList" component={DonateQuestListScreen} />
      <Stack.Screen name="DonateToQuest" component={DonateToQuestScreen} />
    </Stack.Navigator>
  );
}

function QuestsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Campaigns" component={CampaignsScreen} />
      <Stack.Screen name="CampaignDetail" component={CampaignDetailScreen} />
      <Stack.Screen name="SponsorMission" component={SponsorMissionScreen} />
      <Stack.Screen name="FaceVerification" component={FaceVerificationScreen} />
      <Stack.Screen name="SubmitProof" component={SubmitProofScreen} />
      <Stack.Screen name="DailyTaskSelection" component={DailyTaskSelectionScreen} />
      <Stack.Screen name="DailyTaskCamera" component={DailyTaskCameraScreen} />
      <Stack.Screen name="DonatorImpactDashboard" component={DonatorImpactDashboardScreen} />
      <Stack.Screen name="RewardsCelebration" component={RewardsCelebrationScreen} />
    </Stack.Navigator>
  );
}

function WalletStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Stack.Screen name="Lottery" component={LotteryScreen} />
      <Stack.Screen name="TreasureWallet" component={TreasureWalletScreen} />
      <Stack.Screen name="RedeemChallenges" component={RedeemChallengesScreen} />
      <Stack.Screen name="PlayTicketResult" component={PlayTicketResultScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabLabel: {
    fontSize: 11,
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '500',
    marginTop: 2,
  },
  tabLabelActive: {
    fontWeight: '700',
  },
  tabBarStyle: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.creamDark,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingHorizontal: Spacing.xs,
  },
  tabBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    minWidth: 56,
  },
  tabItemInnerActive: {
    backgroundColor: Colors.ivoryBlue,
  },
});

export function AppNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarInactiveTintColor: Colors.textGray,
      }}
    >
      <Tab.Screen
        name="QuestsTab"
        component={QuestsStack}
        options={{
          title: 'Quests',
          tabBarActiveTintColor: Colors.ivoryBlue,
          tabBarIcon: ({ color }) => <TabIcon color={color} emoji="🏴" />,
        }}
      />
      <Tab.Screen
        name="DonateTab"
        component={DonateStack}
        options={{
          title: 'Donate',
          tabBarActiveTintColor: Colors.ivoryBlue,
          tabBarIcon: ({ color }) => <TabIcon color={color} emoji="💝" />,
        }}
      />
      <Tab.Screen
        name="ValidateTab"
        component={ValidateQueueScreen}
        options={{
          title: 'Verify',
          tabBarActiveTintColor: Colors.ivoryBlue,
          tabBarIcon: ({ color }) => <TabIcon color={color} emoji="☑️" />,
        }}
      />
      <Tab.Screen
        name="WalletTab"
        component={WalletStack}
        options={{
          title: 'Wallet',
          tabBarActiveTintColor: Colors.ivoryBlue,
          tabBarIcon: ({ color }) => <TabIcon color={color} emoji="💰" />,
        }}
        initialParams={{ screen: 'TreasureWallet' } as any}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarActiveTintColor: Colors.ivoryBlue,
          tabBarIcon: ({ color }) => <TabIcon color={color} emoji="😊" />,
        }}
      />
    </Tab.Navigator>
  );
}
