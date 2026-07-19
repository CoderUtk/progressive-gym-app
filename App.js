import 'react-native-get-random-values';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';

import DashboardScreen from './screens/DashboardScreen';
import WorkoutLoggerScreen from './screens/WorkoutLoggerScreen';
import ExerciseLibraryScreen from './screens/ExerciseLibraryScreen';
import ExerciseHistoryScreen from './screens/ExerciseHistoryScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';
import TemplateSelectScreen from './screens/TemplateSelectScreen';
import ExercisePickerScreen from './screens/ExercisePickerScreen';
import { colors } from './utils/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function Icon({ label, focused }) {
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>{label}</Text>
  );
}

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarIcon: ({ focused }) => <Icon label="🏠" focused={focused} />, title: 'Progressive' }}
      />
      <Tab.Screen
        name="Exercises"
        component={ExerciseLibraryScreen}
        options={{ tabBarIcon: ({ focused }) => <Icon label="🔍" focused={focused} />, title: 'Exercises' }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ tabBarIcon: ({ focused }) => <Icon label="📈" focused={focused} />, title: 'Analytics' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerTitleStyle: { color: colors.text }, headerTintColor: colors.text, headerShadowVisible: false }}>
        <Stack.Screen name="Home" component={HomeTabs} options={{ headerShown: false }} />
        <Stack.Screen name="WorkoutLogger" component={WorkoutLoggerScreen} options={{ title: 'Log Workout' }} />
        <Stack.Screen name="ExerciseHistory" component={ExerciseHistoryScreen} options={{ title: 'Exercise History' }} />
        <Stack.Screen name="TemplateSelect" component={TemplateSelectScreen} options={{ title: "Today's Workout" }} />
        <Stack.Screen name="ExercisePicker" component={ExercisePickerScreen} options={{ title: 'Select Exercises' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
