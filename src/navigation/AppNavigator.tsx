// Main App Navigation (Bottom Tabs)
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CampaignsScreen } from '../features/campaigns/CampaignsScreen';
import { CampaignDetailScreen } from '../features/campaigns/CampaignDetailScreen';
import { StartCampaignScreen } from '../features/campaigns/StartCampaignScreen';
import { SubmitProofScreen } from '../features/submissions/SubmitProofScreen';
import { FaceVerificationScreen } from '../features/face-verification/FaceVerificationScreen';
import { ValidateQueueScreen } from '../features/validation/ValidateQueueScreen';
import { MySubmissionsScreen } from '../features/submissions/MySubmissionsScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { LeaderboardScreen } from '../features/leaderboard/LeaderboardScreen';
import { LotteryScreen } from '../features/lottery/LotteryScreen';
import { CampaignDonateScreen } from '../features/donations/CampaignDonateScreen';

export type AppStackParamList = {
  Campaigns: undefined;
  CampaignDetail: { campaignId: string };
  StartCampaign: undefined;
  CampaignDonate: { campaignId: string };
  FaceVerification: { campaignId: string; checkpointId: string };
  SubmitProof: { campaignId: string; checkpointId: string };
  ValidateQueue: undefined;
  MySubmissions: undefined;
  Profile: undefined;
  Leaderboard: undefined;
  Lottery: { campaignId: string };
};

export type TabParamList = {
  CampaignsTab: undefined;
  ValidateTab: undefined;
  MySubmissionsTab: undefined;
  LeaderboardTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

function CampaignsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Campaigns" component={CampaignsScreen} options={{ title: 'Campaigns' }} />
      <Stack.Screen name="CampaignDetail" component={CampaignDetailScreen} options={{ title: 'Campaign Details' }} />
      <Stack.Screen name="StartCampaign" component={StartCampaignScreen} options={{ title: 'Start Campaign' }} />
      <Stack.Screen name="CampaignDonate" component={CampaignDonateScreen} options={{ title: 'Donate' }} />
      <Stack.Screen name="FaceVerification" component={FaceVerificationScreen} options={{ title: 'Face Verification' }} />
      <Stack.Screen name="SubmitProof" component={SubmitProofScreen} options={{ title: 'Submit Proof' }} />
    </Stack.Navigator>
  );
}

function LeaderboardStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: 'Leaderboard' }} />
      <Stack.Screen name="Lottery" component={LotteryScreen} options={{ title: 'Lottery' }} />
    </Stack.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
      }}
    >
      <Tab.Screen
        name="CampaignsTab"
        component={CampaignsStack}
        options={{
          title: 'Campaigns',
          tabBarIcon: () => null, // Add icons later
        }}
      />
      <Tab.Screen
        name="ValidateTab"
        component={ValidateQueueScreen}
        options={{
          title: 'Validate',
          tabBarIcon: () => null,
        }}
      />
      <Tab.Screen
        name="MySubmissionsTab"
        component={MySubmissionsScreen}
        options={{
          title: 'My Tasks',
          tabBarIcon: () => null,
        }}
      />
      <Tab.Screen
        name="LeaderboardTab"
        component={LeaderboardStack}
        options={{
          title: 'Leaderboard',
          tabBarIcon: () => null,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: () => null,
        }}
      />
    </Tab.Navigator>
  );
}
