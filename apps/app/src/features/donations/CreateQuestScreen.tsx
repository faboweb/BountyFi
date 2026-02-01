import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { ethers } from 'ethers';
import { useSendUserOperation, useWaitForUserOperation } from '@coinbase/cdp-hooks';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/theme';
import { Button } from '../../components/Button';
import { MediaPicker } from '../../components/MediaPicker';
import { MapPicker } from '../../components/MapPicker';
import { supabase } from '../../utils/supabase';
import { api } from '../../api/client';
import { useAuth } from '../../auth/context';
import { CHAIN_CONFIG } from '../../config/chain';
import { compressImage } from '../../utils/image';
import { uploadCampaignImage } from '../../utils/uploadCampaignImage';

const MIN_DONATION_THB = 50;
const DEFAULT_REGION = { latitude: 18.7883, longitude: 98.9853, latitudeDelta: 0.05, longitudeDelta: 0.05 };
const TIMEFRAME_DAYS = 90;

const BOUNTYFI_ABI = [
  "function createCampaign(string _title, uint8 _type, uint256 _reward, uint256 _stake, uint256 _radius, uint256 _aiThreshold, tuple(string label, string image, string sponsor, bytes32 metadataHash, uint256 amount, uint256 value)[] _prizes) external",
  "event CampaignCreated(uint256 indexed campaignId, string title, uint8 campaignType, uint256 rewardAmount, uint256 prizeCount)",
];

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMaxDate(): Date {
  const d = new Date(getToday().getTime());
  d.setDate(d.getDate() + TIMEFRAME_DAYS);
  return d;
}

function isInRange(dateKey: string, min: Date, max: Date): boolean {
  const [y, m, day] = dateKey.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  return d >= min && d <= max;
}

function getDaysInMonth(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const firstDay = first.getDay();
  const daysInMonth = last.getDate();
  const result: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) result.push(null);
  for (let d = 1; d <= daysInMonth; d++) result.push(d);
  return result;
}

export type QuestTypeId = 'selfie_checkin' | 'simple_proof' | 'before_after_photo' | 'video_proof' | 'written_reflection' | 'multiple_photos';

const QUEST_TYPES: { id: QuestTypeId; label: string; description: string }[] = [
  { id: 'selfie_checkin', label: 'Selfie check-in', description: 'Participants take a selfie at the location to prove they were there.' },
  { id: 'simple_proof', label: 'Simple proof', description: 'Participants submit a single photo as proof of completion.' },
  { id: 'before_after_photo', label: 'Before/after photo', description: 'Participants submit before and after photos to show the change (e.g. cleanup).' },
  { id: 'video_proof', label: 'Video proof', description: 'Participants submit a short video as proof of completion.' },
  { id: 'written_reflection', label: 'Written reflection', description: 'Participants write a short reflection or report about what they did.' },
  { id: 'multiple_photos', label: 'Multiple photos', description: 'Participants submit several photos documenting the activity or result.' },
];

const GOODS_HASHTAGS = [
  { id: 'money', label: '#money' },
  { id: 'vouchers', label: '#vouchers' },
  { id: 'coffee', label: '#coffee' },
  { id: 'meals', label: '#meals' },
  { id: 'hotel', label: '#hotel' },
  { id: 'others', label: '#others' },
] as const;


type NavigationProp = NativeStackNavigationProp<AppStackParamList, 'CreateQuest'>;

export function CreateQuestScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, isCDPAuthenticated } = useAuth();
  const [step, setStep] = React.useState(1);

  // Blockchain transaction state
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [pendingCampaignData, setPendingCampaignData] = React.useState<any>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [currentUserOpHash, setCurrentUserOpHash] = React.useState<string | null>(null);

  const { sendUserOperation, status: userOpStatus } = useSendUserOperation();
  const { data: waitResult, status: waitStatus } = useWaitForUserOperation({
    userOperationHash: (currentUserOpHash as any),
    enabled: !!currentUserOpHash,
  });

  // Step 1 – multiple quest types allowed; selfie check-in is always included (mandatory)
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [questTypes, setQuestTypes] = React.useState<Set<QuestTypeId>>(() => new Set(['selfie_checkin']));
  const [timeframeStart, setTimeframeStart] = React.useState('');
  const [timeframeEnd, setTimeframeEnd] = React.useState('');
  const [timeframeSelectMode, setTimeframeSelectMode] = React.useState<'start' | 'end'>('start');
  const [calendarMonthOffset, setCalendarMonthOffset] = React.useState(0);

  // Step 2
  const [location, setLocation] = React.useState('');
  const [pin, setPin] = React.useState<{ latitude: number; longitude: number } | null>(null);
  const [region, setRegion] = React.useState(DEFAULT_REGION);
  const [radius, setRadius] = React.useState('');

  // Step 3
  const [companyName, setCompanyName] = React.useState('');
  const [brandPhotoUri, setBrandPhotoUri] = React.useState<string | null>(null);
  const [goodsHashtags, setGoodsHashtags] = React.useState<Set<string>>(new Set());
  const [goodsCustomText, setGoodsCustomText] = React.useState('');
  const [goodsPhotoUri, setGoodsPhotoUri] = React.useState<string | null>(null);
  const [donation, setDonation] = React.useState('');

  const [created, setCreated] = React.useState(false);
  const [createdQuestTitle, setCreatedQuestTitle] = React.useState('');
  const [photoModal, setPhotoModal] = React.useState<'brand' | 'goods' | 'quest' | null>(null);
  const [questImageUri, setQuestImageUri] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted' && !pin) {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setRegion((r) => ({ ...r, latitude: loc.coords.latitude, longitude: loc.coords.longitude }));
          setPin({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        } catch (_) {}
      }
    })();
  }, []);

  const toggleGoodsHashtag = (id: string) => {
    setGoodsHashtags((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleQuestType = (id: QuestTypeId) => {
    if (id === 'selfie_checkin') return; // Selfie check-in is mandatory, cannot deselect
    setQuestTypes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };


  const today = React.useMemo(() => getToday(), []);
  const maxDate = React.useMemo(() => getMaxDate(), []);
  const minDateKey = formatDateKey(today);
  const maxDateKey = formatDateKey(maxDate);

  const handleTimeframeDayPress = (dateKey: string) => {
    if (timeframeSelectMode === 'start') {
      setTimeframeStart(dateKey);
      setTimeframeSelectMode('end');
    } else {
      const startD = timeframeStart ? new Date(timeframeStart.replace(/-/g, '/')) : null;
      const endD = new Date(dateKey.replace(/-/g, '/'));
      if (startD && endD < startD) {
        setTimeframeStart(dateKey);
        setTimeframeEnd('');
      } else {
        setTimeframeEnd(dateKey);
      }
    }
  };

  const calendarYear = today.getFullYear();
  const calendarMonth = today.getMonth() + calendarMonthOffset;
  const calendarMonthLabel = new Date(calendarYear, calendarMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysGrid = getDaysInMonth(calendarYear, calendarMonth);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const canProceedStep1 =
    name.trim().length > 0 &&
    description.trim().length > 0 &&
    questTypes.size >= 1 &&
    timeframeStart.trim().length > 0 &&
    timeframeEnd.trim().length > 0;
  const canProceedStep2 = location.trim().length > 0 && pin != null && radius.trim().length > 0 && parseInt(radius, 10) > 0;


  const handleNext = () => {
    if (step === 1 && !canProceedStep1) {
      Alert.alert('Missing info', 'Please enter quest name, description, select at least one quest type, and set start and end dates.');
      return;
    }
    if (step === 2 && !canProceedStep2) {
      Alert.alert('Missing info', 'Please enter location name, set a pin on the map, and enter radius (meters).');
      return;
    }

    if (step < 2) setStep((s) => s + 1);

  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
    else navigation.goBack();
  };

  const handleCreate = () => {
    // Validate all required fields
    if (!name.trim() || !description.trim() || !location.trim() || !pin || !radius) {
      Alert.alert('Missing info', 'Please complete all required fields.');
      return;
    }

    // Prepare campaign data for confirmation
    const campaignData = {
      title: name.trim(),
      description: description.trim(),
      prize_total: 0, // Default for basic quest
      min_funding_thb: MIN_DONATION_THB,
      requires_face_recognition: false,
      start_date: timeframeStart ? new Date(timeframeStart.replace(/-/g, '/')).toISOString() : new Date().toISOString(),
      end_date: timeframeEnd ? new Date(timeframeEnd.replace(/-/g, '/')).toISOString() : new Date().toISOString(),
      checkpoints: [
        {
          lat: pin.latitude,
          lng: pin.longitude,
          radius: parseInt(radius, 10),
          name: location.trim(),
        }
      ],
      prize_chest: [], // Empty for basic quest, can add UI for prizes later
      sponsors: [], // Empty for now
      image_url: questImageUri,
    };

    setPendingCampaignData(campaignData);
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    if (!user?.wallet_address) {
      Alert.alert('Error', 'Wallet not connected');
      return;
    }

    if (!isCDPAuthenticated) {
      Alert.alert(
        'Authentication Required',
        'Your Coinbase wallet session has expired. Please log out and log back in to continue.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowConfirmDialog(false);
              setIsSubmitting(false);
            }
          }
        ]
      );
      return;
    }

    setShowConfirmDialog(false);
    setIsSubmitting(true);

    try {
      // Prepare transaction data
      const iface = new ethers.Interface(BOUNTYFI_ABI);

      const zeroHash = ethers.ZeroHash;
      const prizes = pendingCampaignData.prize_chest.map((p: any) => [
        p.label,
        p.image ?? '',
        p.sponsor ?? '',
        p.metadataHash ?? zeroHash,
        BigInt(p.amount ?? 0),
        BigInt(p.value ?? 0),
      ]);

      // Encode contract call
      const txData = iface.encodeFunctionData('createCampaign', [
        pendingCampaignData.title,
        0, // Campaign type: SINGLE_PHOTO
        ethers.parseEther('0.001'), // Reward amount (0.001 ETH default)
        ethers.parseEther('0.0001'), // Stake amount (0.0001 ETH default)
        pendingCampaignData.checkpoints[0].radius, // Radius in meters
        50, // AI threshold (50% default)
        prizes,
      ]);

      console.log('[CreateQuest] Sending transaction to blockchain...');
      console.log('[CreateQuest] Smart account:', user.wallet_address);
      console.log('[CreateQuest] Contract address:', CHAIN_CONFIG.BOUNTYFI_ADDRESS);

      // Send transaction via Coinbase CDP
      const result = await sendUserOperation({
        evmSmartAccount: user.wallet_address as any,
        network: 'base-sepolia' as any,
        calls: [{ to: CHAIN_CONFIG.BOUNTYFI_ADDRESS as any, data: txData as any }],
        useCdpPaymaster: true,
      });

      if (!result?.userOperationHash) {
        throw new Error('Failed to send transaction: no operation hash returned');
      }

      console.log('[CreateQuest] Transaction sent, hash:', result.userOperationHash);
      setCurrentUserOpHash(result.userOperationHash);
    } catch (error: any) {
      console.error('[CreateQuest] Transaction failed:', error);
      Alert.alert('Transaction failed', error.message || 'Failed to submit to blockchain');
      setIsSubmitting(false);
    }
  };

  const handleTransactionConfirmed = async (receipt: any) => {
    try {
      // Parse CampaignCreated event to get campaign ID
      const iface = new ethers.Interface(BOUNTYFI_ABI);
      const eventTopic = iface.getEvent('CampaignCreated')?.topicHash;
      const log = receipt.logs?.find((l: any) => l.topics[0] === eventTopic);

      if (!log) {
        throw new Error('CampaignCreated event not found in transaction receipt');
      }

      const parsed = iface.parseLog({ topics: log.topics, data: log.data });
      const campaignId = parsed?.args?.campaignId?.toString();

      if (!campaignId) {
        throw new Error('Failed to parse campaign ID from event');
      }

      // Upload quest image if present
      let finalImageUrl = pendingCampaignData.image_url;
      if (questImageUri) {
        try {
          console.log('[CreateQuest] Uploading quest image...');
          const compressed = await compressImage(questImageUri);
          finalImageUrl = await uploadCampaignImage(compressed);
          console.log('[CreateQuest] Image uploaded:', finalImageUrl);
        } catch (uploadErr) {
          console.error('[CreateQuest] Image upload failed:', uploadErr);
          // Proceed without image if upload fails
        }
      }

      // Create Supabase record AFTER blockchain confirmation
      await api.campaigns.create({
        ...pendingCampaignData,
        image_url: finalImageUrl || undefined,
        status: 'pending_onchain',
        tx_hash: receipt.transactionHash,
      });

      // Trigger indexer to sync from blockchain
      await supabase.functions.invoke('indexer', {
        body: {
          event: 'sync_campaign',
          campaignId: campaignId,
          transactionHash: receipt.transactionHash,
        }
      });

      // Show success screen
      setCreatedQuestTitle(pendingCampaignData.title);
      setCreated(true);
      setIsSubmitting(false);
    } catch (error: any) {
      console.error('Post-transaction error:', error);
      Alert.alert(
        'Campaign created on-chain',
        'The campaign was created on the blockchain but failed to sync with the database. Please refresh the app to see it.',
        [
          {
            text: 'OK',
            onPress: () => {
              setIsSubmitting(false);
              navigation.navigate('DonateHome');
            }
          }
        ]
      );
    }
  };

  // Watch for transaction confirmation
  React.useEffect(() => {
    if (waitStatus === 'success' && waitResult?.receipt && pendingCampaignData) {
      handleTransactionConfirmed(waitResult.receipt);
    } else if (waitStatus === 'error') {
      Alert.alert('Transaction failed', 'The blockchain transaction failed. Please try again.');
      setIsSubmitting(false);
      setCurrentUserOpHash(null);
    }
  }, [waitStatus, waitResult, pendingCampaignData]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out my new quest on BountyFi: "${createdQuestTitle}". Join and make an impact!`,
        title: 'Share quest',
      });
    } catch (_) {}
  };

  const handleDone = () => {
    navigation.navigate('DonateHome');
  };

  if (created) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.successContainer}>
          <Image source={require('../../../assets/jellyfish.png')} style={styles.successImage} resizeMode="contain" />
          <Text style={styles.successTitle}>Quest created</Text>
          <Text style={styles.successText}>"{createdQuestTitle}" is live. Share it so others can join!</Text>
          <Button title="Share quest" onPress={handleShare} variant="primary" style={styles.shareBtn} />
          <TouchableOpacity onPress={handleDone} style={styles.doneBtn}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const stepTitles = ['Quest name & type', 'Configurations'];

  const currentStepTitle = stepTitles[step - 1];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.closeBtn}>
          <Text style={styles.closeText}>{step === 1 ? '✕' : '←'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create a new quest</Text>
        <View style={styles.closeBtn} />
      </View>

      <View style={styles.stepIndicator}>
        {[1, 2].map((s) => (
          <View key={s} style={[styles.stepDot, s === step && styles.stepDotActive, s < step && styles.stepDotDone]} />
        ))}
      </View>
      <Text style={styles.stepLabel}>Step {step}: {currentStepTitle}</Text>

      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step 1: Quest name, description, type */}
          {step === 1 && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Quest name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Chiang Mai Riverside Cleanup"
                  placeholderTextColor={Colors.textGray}
                  value={name}
                  onChangeText={setName}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  placeholder="Describe what the quest is about and what you want to achieve..."
                  placeholderTextColor={Colors.textGray}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Quest Image (Optional)</Text>
                <TouchableOpacity
                  style={styles.imagePickerBtn}
                  onPress={() => setPhotoModal('quest')}
                  activeOpacity={0.8}
                >
                  {questImageUri ? (
                    <View style={styles.selectedImageContainer}>
                      <Image source={{ uri: questImageUri }} style={styles.selectedImage} />
                      <View style={styles.imageOverlay}>
                        <Text style={styles.imageOverlayText}>Change Photo</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Text style={styles.imagePlaceholderText}>+ Add Quest Photo</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Quest type (requirements to start) *</Text>
                <Text style={styles.inputHint}>Selfie check-in is required. You can also require one or more proof types below.</Text>
                {QUEST_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.typeCard,
                      questTypes.has(t.id) && styles.typeCardSelected,
                      t.id === 'selfie_checkin' && styles.typeCardMandatory,
                    ]}
                    onPress={() => toggleQuestType(t.id)}
                    activeOpacity={0.8}
                    disabled={t.id === 'selfie_checkin'}
                  >
                    <Text style={[styles.typeLabel, questTypes.has(t.id) && styles.typeLabelSelected]}>{t.label}</Text>
                    <Text style={styles.typeDescription}>{t.description}</Text>
                    {t.id === 'selfie_checkin' && (
                      <Text style={styles.typeBadge}>Required</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Timeframe (requirements) *</Text>
                <Text style={styles.inputHint}>When the quest is active. Tap a date below (today through 3 months).</Text>
                <View style={styles.timeframeSelectRow}>
                  <TouchableOpacity
                    style={[styles.timeframeChip, timeframeSelectMode === 'start' && styles.timeframeChipActive]}
                    onPress={() => setTimeframeSelectMode('start')}
                  >
                    <Text style={styles.timeframeChipLabel}>Start</Text>
                    <Text style={styles.timeframeChipValue} numberOfLines={1}>
                      {timeframeStart || 'Tap calendar'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.timeframeSeparator}>→</Text>
                  <TouchableOpacity
                    style={[styles.timeframeChip, timeframeSelectMode === 'end' && styles.timeframeChipActive]}
                    onPress={() => setTimeframeSelectMode('end')}
                  >
                    <Text style={styles.timeframeChipLabel}>End</Text>
                    <Text style={styles.timeframeChipValue} numberOfLines={1}>
                      {timeframeEnd || 'Tap calendar'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.calendarContainer}>
                  <View style={styles.calendarMonthRow}>
                    <TouchableOpacity
                      onPress={() => setCalendarMonthOffset((o) => Math.max(0, o - 1))}
                      style={styles.calendarNavBtn}
                      disabled={calendarMonthOffset === 0}
                    >
                      <Text style={[styles.calendarNavText, calendarMonthOffset === 0 && styles.calendarNavDisabled]}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.calendarMonthLabel}>{calendarMonthLabel}</Text>
                    <TouchableOpacity
                      onPress={() => setCalendarMonthOffset((o) => Math.min(3, o + 1))}
                      style={styles.calendarNavBtn}
                      disabled={calendarMonthOffset >= 3}
                    >
                      <Text style={[styles.calendarNavText, calendarMonthOffset >= 3 && styles.calendarNavDisabled]}>→</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.calendarWeekRow}>
                    {weekDays.map((w) => (
                      <Text key={w} style={styles.calendarWeekDay}>{w}</Text>
                    ))}
                  </View>
                  <View style={styles.calendarDaysGrid}>
                    {daysGrid.map((day, idx) => {
                      if (day === null) {
                        return <View key={`e-${idx}`} style={styles.calendarDay} />;
                      }
                      const dateKey = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const inRange = isInRange(dateKey, today, maxDate);
                      const isStart = dateKey === timeframeStart;
                      const isEnd = dateKey === timeframeEnd;
                      return (
                        <TouchableOpacity
                          key={dateKey}
                          style={[
                            styles.calendarDay,
                            !inRange && styles.calendarDayDisabled,
                            inRange && styles.calendarDayEnabled,
                            isStart && styles.calendarDayStart,
                            isEnd && styles.calendarDayEnd,
                          ]}
                          onPress={() => inRange && handleTimeframeDayPress(dateKey)}
                          disabled={!inRange}
                        >
                          <Text style={[styles.calendarDayText, !inRange && styles.calendarDayTextDisabled, (isStart || isEnd) && styles.calendarDayTextSelected]}>
                            {day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            </>
          )}

          {/* Step 2: Configurations (location-based) */}
          {step === 2 && (
            <>
              <View style={styles.configNote}>
                <Text style={styles.configNoteText}>
                  Location-based: participants must be within the radius to submit proof. Set the area where the quest takes place.
                </Text>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Quest location name (specific or area) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Uniserv CMU Chiang Mai"
                  placeholderTextColor={Colors.textGray}
                  value={location}
                  onChangeText={setLocation}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Location on map *</Text>
                <Text style={styles.inputHint}>Search or tap the map to add a pin. Minimum radius is 10m.</Text>
                <MapPicker
                    initialRegion={region}
                    pin={pin}
                    onPinChange={(coord) => setPin(coord)}
                    onLocationSelect={(name) => setLocation(name)}
                />
                {pin && (
                    <Text style={styles.coordText}>
                        Pin: {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}
                    </Text>
                )}
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Radius (meters) *</Text>
                <Text style={styles.inputHint}>How far from the pin participants can be to submit (e.g. 100).</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 100"
                  placeholderTextColor={Colors.textGray}
                  value={radius}
                  onChangeText={setRadius}
                  keyboardType="numeric"
                />
              </View>
            </>
          )}



          <View style={styles.footerButtons}>
            {step < 2 ? (
              <Button title="Next" onPress={handleNext} variant="primary" style={styles.nextBtn} />
            ) : (
              <Button title="Create!" onPress={handleCreate} variant="primary" style={styles.nextBtn} />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showConfirmDialog} animationType="slide" transparent onRequestClose={() => !isSubmitting && setShowConfirmDialog(false)}>
        <View style={styles.confirmDialogOverlay}>
          <View style={styles.confirmDialogContainer}>
            <Text style={styles.confirmDialogTitle}>Confirm Quest Launch</Text>
            <ScrollView style={styles.confirmDialogScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.confirmDialogLabel}>Quest:</Text>
              <Text style={styles.confirmDialogValue}>{pendingCampaignData?.title}</Text>

              <Text style={styles.confirmDialogLabel}>Location:</Text>
              <Text style={styles.confirmDialogValue}>{pendingCampaignData?.checkpoints?.[0]?.name}</Text>

              <Text style={styles.confirmDialogLabel}>Timeframe:</Text>
              <Text style={styles.confirmDialogValue}>
                {timeframeStart} → {timeframeEnd}
              </Text>

              <View style={styles.confirmDialogNote}>
                <Text style={styles.confirmDialogNoteText}>
                  This will submit your quest to the blockchain. Transaction fees are covered by Coinbase.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.confirmDialogButtons}>
              <TouchableOpacity
                style={[styles.confirmDialogBtn, styles.confirmDialogBtnSecondary]}
                onPress={() => setShowConfirmDialog(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.confirmDialogBtnTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmDialogBtn, styles.confirmDialogBtnPrimary]}
                onPress={handleConfirmSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.confirmDialogBtnTextPrimary}>Confirm & Launch</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={photoModal !== null} animationType="slide" onRequestClose={() => setPhotoModal(null)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{photoModal === 'brand' ? 'Photo of your brand' : 'Photo of donated goods'}</Text>
            <TouchableOpacity onPress={() => setPhotoModal(null)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.mediaPickerWrap}>
            <MediaPicker
              onSelect={(uri) => {
                if (photoModal === 'brand') setBrandPhotoUri(uri);
                else if (photoModal === 'quest') setQuestImageUri(uri);
                else setGoodsPhotoUri(uri);
                setPhotoModal(null);
              }}
              onError={(err) => Alert.alert('Upload Error', err)}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 20, color: Colors.textPrimary },
  headerTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 18,
    color: Colors.textPrimary,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primaryLight,
  },
  stepDotActive: { backgroundColor: Colors.ivoryBlue, transform: [{ scale: 1.2 }] },
  stepDotDone: { backgroundColor: Colors.ivoryBlueLight },
  stepLabel: {
    fontSize: 13,
    color: Colors.textGray,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: 80 },
  inputGroup: { marginBottom: Spacing.lg },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    ...Shadows.sm,
  },
  inputMultiline: { minHeight: 100, textAlignVertical: 'top' },
  inputHint: { fontSize: 12, color: Colors.textGray, marginTop: Spacing.xs, marginBottom: Spacing.xs },
  typeCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
    ...Shadows.sm,
  },
  typeCardSelected: { borderColor: Colors.ivoryBlue, backgroundColor: Colors.ivoryBlueLight + '15' },
  typeCardMandatory: { borderColor: Colors.primaryLight, opacity: 0.9 },
  typeLabel: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  typeLabelSelected: { color: Colors.ivoryBlue },
  typeDescription: { fontSize: 13, color: Colors.textGray, lineHeight: 20 },
  typeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textGray,
    textTransform: 'uppercase',
  },

  timeframeSelectRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs, marginBottom: Spacing.md },
  timeframeChip: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
    ...Shadows.sm,
  },
  timeframeChipActive: { borderColor: Colors.ivoryBlue, backgroundColor: Colors.ivoryBlueLight + '15' },
  timeframeChipLabel: { fontSize: 11, fontWeight: '600', color: Colors.textGray, marginBottom: 2 },
  timeframeChipValue: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  timeframeSeparator: { fontSize: 16, color: Colors.textGray, fontWeight: '600' },
  calendarContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    ...Shadows.sm,
  },
  calendarMonthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  calendarNavBtn: { padding: Spacing.sm, minWidth: 44, alignItems: 'center' },
  calendarNavText: { fontSize: 18, fontWeight: '700', color: Colors.ivoryBlue },
  calendarNavDisabled: { color: Colors.primaryLight },
  calendarMonthLabel: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  calendarWeekRow: { flexDirection: 'row', marginBottom: Spacing.xs },
  calendarWeekDay: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '600', color: Colors.textGray },
  calendarDaysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    maxWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  calendarDayDisabled: { opacity: 0.35 },
  calendarDayEnabled: {},
  calendarDayStart: { backgroundColor: Colors.ivoryBlueLight + '40', borderRadius: BorderRadius.md },
  calendarDayEnd: { backgroundColor: Colors.ivoryBlue + '40', borderRadius: BorderRadius.md },
  calendarDayText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  calendarDayTextDisabled: { color: Colors.textGray },
  calendarDayTextSelected: { color: Colors.textPrimary, fontWeight: '700' },
  configNote: {
    backgroundColor: Colors.ivoryBlueLight + '25',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.ivoryBlue,
  },
  configNoteText: { fontSize: 13, color: Colors.textPrimary, lineHeight: 20 },
  gpsHint: { fontSize: 12, color: Colors.textGray, marginTop: Spacing.xs },
  mapContainer: { height: 200, borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: Spacing.xs, ...Shadows.sm },
  map: { width: '100%', height: '100%' },
  mapPlaceholder: {
    minHeight: 120,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.ivoryBlueLight,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    marginTop: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  mapPlaceholderText: { fontSize: 14, color: Colors.textGray, marginBottom: Spacing.sm },
  useLocationBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },
  useLocationText: { fontSize: 16, fontWeight: '600', color: Colors.ivoryBlue },
  coordText: { fontSize: 12, color: Colors.textGray, marginTop: Spacing.xs },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
  tagChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
    ...Shadows.sm,
  },
  tagChipSelected: { borderColor: Colors.ivoryBlue, backgroundColor: Colors.ivoryBlueLight + '20' },
  tagLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  tagLabelSelected: { color: Colors.textPrimary },
  goodsCustomInput: { marginTop: Spacing.xs },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  photoThumb: { width: 80, height: 80, borderRadius: BorderRadius.lg, backgroundColor: Colors.primaryLight },
  changePhotoBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.ivoryBlueLight + '30',
  },
  changePhotoText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  addPhotoBox: {
    minHeight: 100,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  addPhotoEmoji: { fontSize: 32, marginBottom: Spacing.xs },
  addPhotoText: { fontSize: 14, color: Colors.textGray },
  reminderBox: {
    backgroundColor: Colors.ivoryBlueLight + '20',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.xs,
  },
  reminderText: { fontSize: 13, color: Colors.textPrimary },
  footerButtons: { marginTop: Spacing.lg },
  nextBtn: { width: '100%' },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primaryLight,
  },
  modalTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 18,
    color: Colors.textPrimary,
  },
  modalClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { fontSize: 20, color: Colors.textPrimary },
  cameraWrap: { flex: 1, minHeight: 400 },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  successImage: { width: 280, height: 280, marginBottom: Spacing.lg },
  successTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 22,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  successText: {
    fontSize: 16,
    color: Colors.textGray,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  shareBtn: { width: '100%', marginBottom: Spacing.md },
  doneBtn: { paddingVertical: Spacing.md },
  doneBtnText: { fontSize: 16, fontWeight: '600', color: Colors.ivoryBlue },
  confirmDialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  confirmDialogContainer: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    ...Shadows.lg,
  },
  confirmDialogTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 20,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  confirmDialogScroll: {
    maxHeight: 300,
    marginBottom: Spacing.md,
  },
  confirmDialogLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textGray,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  confirmDialogValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  confirmDialogNote: {
    backgroundColor: Colors.ivoryBlueLight + '25',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.ivoryBlue,
  },
  confirmDialogNoteText: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  confirmDialogButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  confirmDialogBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  confirmDialogBtnSecondary: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
  },
  confirmDialogBtnPrimary: {
    backgroundColor: Colors.ivoryBlue,
  },
  confirmDialogBtnTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  confirmDialogBtnTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  imagePickerBtn: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    height: 150,
    borderWidth: 1,
    borderColor: Colors.creamDark,
    borderStyle: 'dashed',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  selectedImageContainer: {
    width: '100%',
    height: '100%',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  imageOverlayText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    color: Colors.textGray,
    fontSize: 14,
    fontWeight: '500',
  },
});
