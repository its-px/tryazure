import { configureStore } from "@reduxjs/toolkit";
import appReducer from "./slices/appSlice";
import themeReducer from "./slices/themeSlice";

export const store = configureStore({
  reducer: {
    app: appReducer,
    theme: themeReducer,
  },
  // middleware: (getDefaultMiddleware) => getDefaultMiddleware(), // you can add custom middleware later
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
