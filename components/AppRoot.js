import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Pressable } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Feather } from '@expo/vector-icons';
import DashboardScreen from '../screens/DashboardScreen';
import WorkoutLoggerScreen from '../screens/WorkoutLoggerScreen';
import ExerciseLibraryScreen from '../screens/ExerciseLibraryScreen';
import ExerciseHistoryScreen from '../screens/ExerciseHistoryScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import TemplateSelectScreen from '../screens/TemplateSelectScreen';
import ExercisePickerScreen from '../screens/ExercisePickerScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import ProfileSummaryScreen from '../screens/ProfileSummaryScreen';
import DailyPlanScreen from '../screens/DailyPlanScreen';
import SettingsScreen from '../screens/SettingsScreen';
import DayWorkoutScreen from '../screens/DayWorkoutScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AppLogo from './AppLogo';
import AppHeaderTitle from './AppHeaderTitle';
import ActiveSessionPill from './ActiveSessionPill';
import { colors } from '../utils/theme';
import { hasSeenOnboarding, clearAllData } from '../utils/storage';
import { WorkoutSessionProvider } from '../utils/workoutSession';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Clean minimalist stroke icons (Feather, bundled with Expo) instead of
// emoji — selected/unselected colors handled by tabBarActiveTintColor /
// tabBarInactiveTintColor below.
function TabIcon({ name, color }) {
  return <Feather name={name} size={22} color={color} />;
}

// Shared across both navigators so the logo + "name · date" line shows up
// on every screen with a header, not just the dashboard.
const sharedHeaderOptions = {
  headerStyle: { backgroundColor: colors.bg },
  headerTitleStyle: { color: colors.text },
  headerTintColor: colors.text,
  headerShadowVisible: false,
  headerTitleAlign: 'center',
  headerLeft: () => <AppLogo />,
  headerTitle: ({ children }) => <AppHeaderTitle title={children} />,
};

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        ...sharedHeaderOptions,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarActiveTintColor: '#3EE09E',
        tabBarInactiveTintColor: '#64748B',
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={({ navigation }) => ({
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
          title: 'Progressive',
          headerRight: () => (
            <Pressable onPress={() => navigation.navigate('Settings')} style={{ paddingHorizontal: 12 }}>
              <Feather name="settings" size={20} color={colors.text} />
            </Pressable>
          ),
        })}
      />
      <Tab.Screen name="Exercises" component={ExerciseLibraryScreen} options={{ tabBarIcon: ({ color }) => <TabIcon name="search" color={color} />, title: 'Exercises' }} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ tabBarIcon: ({ color }) => <TabIcon name="bar-chart-2" color={color} />, title: 'Analytics' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: ({ color }) => <TabIcon name="user" color={color} />, title: 'Profile' }} />
    </Tab.Navigator>
  );
}

export default function AppRoot() {
  const [initialRoute, setInitialRoute] = useState('Loading');

  useEffect(() => {
    async function init() {
      const seen = await hasSeenOnboarding();
      if (!seen) {
        await clearAllData();
      }
      setInitialRoute(seen ? 'Home' : 'Welcome');
    }
    init();
  }, []);

  if (initialRoute === 'Loading') {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <WorkoutSessionProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <Stack.Navigator screenOptions={sharedHeaderOptions}>
            <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ProfileSummary" component={ProfileSummaryScreen} options={{ headerShown: false }} />
            <Stack.Screen name="DailyPlan" component={DailyPlanScreen} options={{ title: 'Choose Workout' }} />
            <Stack.Screen name="Home" component={HomeTabs} options={{ headerShown: false }} />
            <Stack.Screen name="WorkoutLogger" component={WorkoutLoggerScreen} options={{ title: 'Log Workout' }} />
            <Stack.Screen name="ExerciseHistory" component={ExerciseHistoryScreen} options={{ title: 'Exercise History' }} />
            <Stack.Screen name="TemplateSelect" component={TemplateSelectScreen} options={{ title: 'My Routines' }} />
            <Stack.Screen name="ExercisePicker" component={ExercisePickerScreen} options={{ title: 'Select Exercises' }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
            <Stack.Screen name="DayWorkout" component={DayWorkoutScreen} options={{ title: 'Workout History' }} />
          </Stack.Navigator>
          <ActiveSessionPill />
        </NavigationContainer>
      </WorkoutSessionProvider>
    </SafeAreaProvider>
  );
}
