import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator, BottomTabBar } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/theme';
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
import { TeamScreen } from '../features/team/TeamScreen';
import { AddTeamMemberScreen } from '../features/team/AddTeamMemberScreen';

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
  AddTeamMember: undefined;
};

export type TabParamList = {
  QuestsTab: undefined;
  DonateTab: undefined;
  ValidateTab: undefined;
  TeamTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

const TAB_BAR_HEIGHT = 67;
const TAB_ICON_SIZE = 32;
const TAB_ICON_SIZE_ROUND = 28;
const TABS_OFFSET_UP = 4;

function CustomTabBar(props: BottomTabBarProps) {
  return (
    <View style={styles.tabBarOuter}>
      <View style={styles.tabBarContentWrap}>
        <BottomTabBar {...props} />
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

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="TreasureWallet" component={TreasureWalletScreen} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Stack.Screen name="Lottery" component={LotteryScreen} />
      <Stack.Screen name="RedeemChallenges" component={RedeemChallengesScreen} />
      <Stack.Screen name="PlayTicketResult" component={PlayTicketResultScreen} />
    </Stack.Navigator>
  );
}

function TeamStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Team" component={TeamScreen} />
      <Stack.Screen name="AddTeamMember" component={AddTeamMemberScreen} />
    </Stack.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Tab.Navigator
      tabBar={(p) => <CustomTabBar {...p} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.ivoryBlue,
        tabBarInactiveTintColor: '#999999',
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="QuestsTab"
        component={QuestsStack}
        options={{
          title: 'Quests',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={TAB_ICON_SIZE_ROUND} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="DonateTab"
        component={DonateStack}
        options={{
          title: 'Donate',
          tabBarIcon: ({ focused, color }) => (
            <View style={styles.tabIconWrap}>
              <Ionicons name={focused ? 'heart' : 'heart-outline'} size={TAB_ICON_SIZE_ROUND} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="ValidateTab"
        component={ValidateQueueScreen}
        options={{
          title: 'Verify',
          tabBarIcon: ({ focused, color }) => (
            <View style={styles.tabIconWrap}>
              <Ionicons name={focused ? 'checkmark-circle' : 'checkmark-circle-outline'} size={TAB_ICON_SIZE_ROUND} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="TeamTab"
        component={TeamStack}
        options={{
          title: 'Team',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={TAB_ICON_SIZE_ROUND} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={TAB_ICON_SIZE_ROUND} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarOuter: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
    paddingTop: 10,
    paddingBottom: 20,
    overflow: 'visible',
  },
  tabBarContentWrap: {
    overflow: 'visible',
  },
  tabBar: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    height: TAB_BAR_HEIGHT,
    paddingTop: 10,
    paddingBottom: 14,
    overflow: 'visible',
    marginTop: -TABS_OFFSET_UP,
  },
  tabIconWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
