export const Colors = {
    // Admiral Blue
    primaryDark: '#1E3A8A',
    primaryBright: '#3B82F6',
    primaryLight: '#60A5FA',

    // Winner Gold
    accentGold: '#FBBF24',
    accentGoldDeep: '#F59E0B',

    // Success Green
    success: '#10B981',
    error: '#FF4B4B',

    // Neutral
    // Gamification
    streak: '#FF9600',
    currency: '#1CB0F6',
    xp: '#FFC800',
    missionPhoto: '#1CB0F6',
    missionCleanup: '#78C800',
    missionQuest: '#CE82FF',
    white: '#FFFFFF',
    lightGray: '#F7F7F7',
    textGray: '#777777',
    navyBlack: '#1E293B',

    // Gradients
    primaryGradient: ['#1E3A8A', '#3B82F6'] as const,
    goldGradient: ['#FBBF24', '#F59E0B', '#FBBF24'] as const,
    successGradient: ['#3B82F6', '#10B981'] as const,
};

export const Typography = {
    heading: {
        fontFamily: 'System', // Fredoka One recommended in guide if available
        fontWeight: '800' as const,
        fontSize: 28,
        textTransform: 'uppercase' as const,
        letterSpacing: 1.5,
        color: Colors.primaryDark,
    },
    subHeading: {
        fontFamily: 'System',
        fontWeight: '600' as const,
        fontSize: 18,
        color: Colors.textGray,
    },
    body: {
        fontFamily: 'System',
        fontWeight: '400' as const,
        fontSize: 16,
        color: Colors.navyBlack,
    },
    button: {
        fontFamily: 'System',
        fontWeight: '700' as const,
        fontSize: 16,
        textTransform: 'uppercase' as const,
        letterSpacing: 1,
        color: Colors.white,
    },
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
};

export const BorderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
};

export const Shadows = {
    primary: {
        shadowColor: Colors.primaryDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    card: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
};
