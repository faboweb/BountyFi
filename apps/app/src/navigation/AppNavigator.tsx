import * as React from 'react';
import { View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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

export function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#5B8DAF',
        tabBarInactiveTintColor: '#8E8E93',
      }}
    >
      <Tab.Screen
        name="QuestsTab"
        component={QuestsStack}
        options={{
          title: 'Quests',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏴</Text>,
        }}
      />
      <Tab.Screen
        name="DonateTab"
        component={DonateStack}
        options={{
          title: 'Donate',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>💝</Text>,
        }}
      />
      <Tab.Screen
        name="ValidateTab"
        component={ValidateQueueScreen}
        options={{
          title: 'Verify',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>☑️</Text>,
        }}
      />
      <Tab.Screen
        name="WalletTab"
        component={WalletStack}
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🔲</Text>,
        }}
        initialParams={{ screen: 'TreasureWallet' } as any}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}
