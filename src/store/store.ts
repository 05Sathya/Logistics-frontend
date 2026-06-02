import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import logisticsReducer from './logisticsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    logistics: logisticsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
