"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Shield,
  Sliders,
  Bell,
  Eye,
  Key,
  Laptop,
  Smartphone,
  Trash2,
  Lock,
  Layers,
  Sparkles,
  Globe,
  Calendar,
  Clock,
  EyeOff,
  Mail,
  PhoneCall,
  Camera,
  Menu,
} from "lucide-react";
import { toast } from "sonner";

interface DeviceSession {
  id: string;
  device: string;
  browser: string;
  ipAddress: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

type TabType = "profile" | "security" | "preferences" | "notifications" | "permissions";

export default function SettingsPage() {
  const { user } = useAuth();
  const { activeFamily } = useWorkspace();
  const familyId = activeFamily?.id;

  // Tabs: "profile", "security", "preferences", "notifications", "permissions"
  const [activeTab, setActiveTab] = useState<TabType>("profile");

  // --- Profile Fields ---
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load profile values
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setEmail(user.email || "");
    }

    const savedProfile = localStorage.getItem("settings_user_profile");
    if (savedProfile) {
      const p = JSON.parse(savedProfile);
      if (p.fullName) setFullName(p.fullName);
      if (p.phone) setPhone(p.phone);
      if (p.address) setAddress(p.address);
    }

    const savedAvatar = localStorage.getItem("settings_user_avatar");
    if (savedAvatar) {
      setAvatar(savedAvatar);
    }
  }, [user]);

  // Avatar handlers
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Avatar size should be under 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setAvatar(base64String);
        localStorage.setItem("settings_user_avatar", base64String);
        toast.success("Avatar updated successfully.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
    localStorage.removeItem("settings_user_avatar");
    toast.success("Avatar removed.");
  };

  const handleSaveProfile = () => {
    if (!fullName) {
      toast.error("Full Name is required.");
      return;
    }
    const profile = { fullName, phone, address };
    localStorage.setItem("settings_user_profile", JSON.stringify(profile));
    toast.success("Profile saved successfully!");
  };

  // --- Profile Completion ---
  const profileCompletion = useMemo(() => {
    let score = 0;
    if (fullName) score += 25;
    if (email) score += 25;
    if (phone) score += 25;
    if (address) score += 25;
    return score;
  }, [fullName, email, phone, address]);

  // --- Security Passwords ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleUpdatePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All password fields are required.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Confirm password does not match.");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password updated successfully!");
  };

  // --- Security Sessions ---
  const [sessions, setSessions] = useState<DeviceSession[]>([
    {
      id: "session-1",
      device: "Windows Desktop PC",
      browser: "Google Chrome",
      ipAddress: "192.168.1.45",
      location: "San Francisco, CA",
      lastActive: "Active Now",
      isCurrent: true,
    },
    {
      id: "session-2",
      device: "Apple iPhone 14",
      browser: "Safari Mobile",
      ipAddress: "10.0.8.21",
      location: "San Jose, CA",
      lastActive: "2 hours ago",
      isCurrent: false,
    },
  ]);

  const handleRevokeSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    toast.success("Session revoked successfully.");
  };

  // --- Theme Controller ---
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");
  const [lang, setLang] = useState("english");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");

  useEffect(() => {
    const savedTheme = (localStorage.getItem("familyos_theme") as "dark" | "light") || "dark";
    setTheme(savedTheme);
  }, []);

  const handleChangeTheme = (nextTheme: "dark" | "light" | "system") => {
    setTheme(nextTheme);
    const resolvedTheme = nextTheme === "system" ? "dark" : nextTheme;
    localStorage.setItem("familyos_theme", resolvedTheme);
    if (resolvedTheme === "light") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    }
    toast.success(`Theme updated to ${nextTheme} mode.`);
  };

  // --- Notifications Preferences ---
  const [prefEmail, setPrefEmail] = useState(true);
  const [prefPush, setPrefPush] = useState(true);
  const [prefSms, setPrefSms] = useState(false);
  const [prefInApp, setPrefInApp] = useState(true);
  const [prefFrequency, setPrefFrequency] = useState("daily");
  const [prefQuietHours, setPrefQuietHours] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`alerts_prefs_${familyId || "global"}`);
    if (saved) {
      const p = JSON.parse(saved);
      setPrefEmail(p.email ?? true);
      setPrefPush(p.push ?? true);
      setPrefSms(p.sms ?? false);
      setPrefInApp(p.inApp ?? true);
      setPrefFrequency(p.frequency ?? "daily");
      setPrefQuietHours(p.quietHours ?? false);
    }
  }, [familyId]);

  const handleSaveNotifications = () => {
    const config = {
      email: prefEmail,
      push: prefPush,
      sms: prefSms,
      inApp: prefInApp,
      frequency: prefFrequency,
      quietHours: prefQuietHours,
    };
    localStorage.setItem(`alerts_prefs_${familyId || "global"}`, JSON.stringify(config));
    toast.success("Notification delivery options saved!");
  };

  const navTabs = useMemo<{ id: TabType; name: string; icon: React.ReactNode }[]>(() => [
    { id: "profile", name: "My Profile", icon: <User className="h-4 w-4" /> },
    { id: "security", name: "Security & Login", icon: <Shield className="h-4 w-4" /> },
    { id: "preferences", name: "App Preferences", icon: <Sliders className="h-4 w-4" /> },
    { id: "notifications", name: "Notifications", icon: <Bell className="h-4 w-4" /> },
    { id: "permissions", name: "Role Scopes", icon: <Layers className="h-4 w-4" /> },
  ], []);

  return (
    <PageContainer>
      {/* 1. Profile cover banner */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-background p-6 mb-8 select-none animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10 text-left">
          
          {/* Uploader Avatar with hover state */}
          <div className="relative group shrink-0 h-24 w-24 rounded-full border-2 border-accent bg-secondary shadow-md overflow-hidden transition-all duration-300 hover:scale-105">
            {avatar ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={avatar} alt="User Profile" className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-black text-muted-foreground flex h-full w-full items-center justify-center">
                {fullName?.[0]?.toUpperCase() || "U"}
              </span>
            )}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] text-white font-bold cursor-pointer transition-all duration-200"
            >
              <Camera className="h-5 w-5 mb-1" />
              Change Photo
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-foreground">{fullName || "User Profile"}</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-0.5 text-[9px] font-black text-accent border border-accent/20 uppercase tracking-wider">
                {((user as unknown as Record<string, unknown>)?.role as string) || "FAMILY_OWNER"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{email}</p>
            <p className="text-[10px] text-muted-foreground/60">
              Workspace Scope: <span className="font-bold text-muted-foreground">{activeFamily?.name || "whole family"}</span>
            </p>
          </div>

          {/* completion gauge */}
          <div className="flex items-center gap-4 shrink-0 bg-secondary/15 border border-border/40 p-3.5 rounded-2xl backdrop-blur-sm">
            <div className="relative flex items-center justify-center h-12 w-12">
              <svg className="absolute w-full h-full transform -rotate-90">
                <circle cx="24" cy="24" r="20" className="stroke-secondary/25" strokeWidth="4" fill="transparent" />
                <motion.circle
                  cx="24"
                  cy="24"
                  r="20"
                  className="stroke-accent"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={125.6}
                  initial={{ strokeDashoffset: 125.6 }}
                  animate={{ strokeDashoffset: 125.6 - (125.6 * profileCompletion) / 100 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </svg>
              <span className="text-[10px] font-black text-foreground">{profileCompletion}%</span>
            </div>
            <div className="text-left space-y-0.5">
              <span className="text-[9px] font-bold text-muted-foreground/60 uppercase">Profile Completion</span>
              <p className="text-[10px] text-muted-foreground leading-none">
                {profileCompletion === 100 ? "Fully configured" : "Pending fields"}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* 2. Tabs content grid */}
      <div className="grid gap-6 md:grid-cols-4 select-none animate-in fade-in duration-300">
        
        {/* Navigation Tabs - Desktop */}
        <div className="hidden md:flex flex-col gap-1 border-r border-border/30 pr-4">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-left relative transition-all ${
                  isActive
                    ? "bg-secondary text-foreground shadow-sm font-black"
                    : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="activeTabPill"
                    className="absolute inset-0 bg-secondary/80 rounded-xl -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {tab.icon}
                {tab.name}
              </button>
            );
          })}
        </div>

        {/* Navigation Dropdown switcher - Mobile */}
        <div className="md:hidden flex flex-col gap-1.5 border-b border-border/30 pb-4 mb-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1 text-left">
            <Menu className="h-3.5 w-3.5" />
            Select Section
          </label>
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as TabType)}
            className="w-full h-10 rounded-lg border border-border bg-secondary/15 px-3 text-xs outline-none"
          >
            {navTabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.name}
              </option>
            ))}
          </select>
        </div>

        {/* Dynamic tabs switch panels */}
        <div className="md:col-span-3">
          <AnimatePresence mode="wait">
            
            {/* Tab 1: Profile forms */}
            {activeTab === "profile" && (
              <motion.div
                key="tab-profile"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6 text-left"
              >
                <Card className="bg-card/45 border-border/80">
                  <CardHeader className="pb-3 border-b border-border/25">
                    <CardTitle className="text-sm font-bold">Personal Context Information</CardTitle>
                    <CardDescription className="text-[10px]">
                      Modify contact configurations used globally across readiness scans and assistant grounds.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4 text-xs">
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-muted-foreground">Full Name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="h-9 rounded-lg border border-border bg-secondary/15 px-3 text-xs outline-none focus:border-ring/30"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-muted-foreground">Email Address (Read-only)</label>
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="h-9 rounded-lg border border-border bg-secondary/35 px-3 text-xs text-muted-foreground cursor-not-allowed outline-none"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-bold text-muted-foreground">Phone Number</label>
                        <input
                          type="text"
                          placeholder="+1 (555) 000-0000"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="h-9 rounded-lg border border-border bg-secondary/15 px-3 text-xs outline-none focus:border-ring/30"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="font-bold text-muted-foreground">Home Address</label>
                        <input
                          type="text"
                          placeholder="Street, City, Zip"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="h-9 rounded-lg border border-border bg-secondary/15 px-3 text-xs outline-none focus:border-ring/30"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 justify-between pt-4 border-t border-border/20">
                      {avatar && (
                        <button
                          onClick={handleRemoveAvatar}
                          className="flex items-center gap-1 px-2.5 h-8 rounded border border-border hover:bg-rose-500/5 hover:text-rose-500 text-muted-foreground transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                          Remove Photo
                        </button>
                      )}
                      <Button onClick={handleSaveProfile} className="bg-accent hover:bg-accent/80 text-white ml-auto">
                        Save Profile
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Tab 2: Security credentials */}
            {activeTab === "security" && (
              <motion.div
                key="tab-security"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6 text-left"
              >
                <div className="grid gap-6 md:grid-cols-3">
                  
                  {/* Change Password */}
                  <Card className="bg-card/45 border-border/80 md:col-span-2">
                    <CardHeader className="pb-3 border-b border-border/25">
                      <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                        <Key className="h-4.5 w-4.5 text-indigo-400" />
                        Credentials Password
                      </CardTitle>
                      <CardDescription className="text-[10px]">
                        Modify password key credentials for your account login.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4 text-xs">
                      
                      <div className="flex flex-col gap-1">
                        <label className="font-bold text-muted-foreground">Current Password</label>
                        <div className="relative">
                          <input
                            type={showPass ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full h-9 rounded-lg border border-border bg-secondary/15 px-3 text-xs outline-none focus:border-ring/30"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPass(!showPass)}
                            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                          >
                            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-1">
                          <label className="font-bold text-muted-foreground">New Password</label>
                          <input
                            type={showPass ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="h-9 rounded-lg border border-border bg-secondary/15 px-3 text-xs outline-none"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="font-bold text-muted-foreground">Confirm New Password</label>
                          <input
                            type={showPass ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="h-9 rounded-lg border border-border bg-secondary/15 px-3 text-xs outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-3 border-t border-border/20">
                        <Button onClick={handleUpdatePassword} className="bg-accent hover:bg-accent/80 text-white">
                          Update Password
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Active Sessions */}
                  <Card className="bg-card/45 border-border/80">
                    <CardHeader className="pb-3 border-b border-border/25">
                      <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                        <Laptop className="h-4.5 w-4.5 text-indigo-400" />
                        Device Sessions
                      </CardTitle>
                      <CardDescription className="text-[10px]">
                        Inspect active browser device connection log list.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3.5 text-[11px]">
                      {sessions.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground italic">No sessions found.</div>
                      ) : (
                        sessions.map((sess) => (
                          <div
                            key={sess.id}
                            className="p-3 border border-border/60 bg-secondary/10 rounded-xl space-y-1 relative"
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-extrabold text-foreground flex items-center gap-1">
                                {sess.device.includes("iPhone") ? (
                                  <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                                ) : (
                                  <Laptop className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                                {sess.device}
                              </span>
                              {sess.isCurrent ? (
                                <span className="text-[8px] bg-emerald-500/10 text-emerald-500 font-extrabold px-1 py-0.5 rounded">
                                  Current
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleRevokeSession(sess.id)}
                                  className="text-[8px] text-danger hover:underline font-extrabold"
                                >
                                  Revoke
                                </button>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-normal">
                              {sess.browser} • {sess.ipAddress}
                            </p>
                            <p className="text-[9px] text-muted-foreground/60">
                              {sess.location} • {sess.lastActive}
                            </p>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}

            {/* Tab 3: UI Preference toggles */}
            {activeTab === "preferences" && (
              <motion.div
                key="tab-preferences"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6 text-left"
              >
                <Card className="bg-card/45 border-border/80">
                  <CardHeader className="pb-3 border-b border-border/25">
                    <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                      <Sliders className="h-4.5 w-4.5 text-indigo-400" />
                      UI Styles & Localization
                    </CardTitle>
                    <CardDescription className="text-[10px]">
                      Manage time zone, language formats, and theme rendering.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 space-y-6 text-xs">
                    
                    {/* Theme selector */}
                    <div className="space-y-2">
                      <label className="font-bold text-muted-foreground uppercase text-[10px]">Theme Mode</label>
                      <div className="grid gap-4 grid-cols-3 max-w-md">
                        {(["light", "dark", "system"] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => handleChangeTheme(t)}
                            className={`h-16 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold ${
                              theme === t
                                ? "border-accent bg-accent/10 text-accent shadow-sm"
                                : "border-border bg-secondary/15 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <span className="capitalize">{t} Mode</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border/20">
                      {/* Language */}
                      <div className="flex flex-col gap-1.5">
                        <label className="font-bold text-muted-foreground flex items-center gap-1">
                          <Globe className="h-3.5 w-3.5" />
                          System Language
                        </label>
                        <select
                          value={lang}
                          onChange={(e) => setLang(e.target.value)}
                          className="h-10 rounded-lg border border-border bg-secondary/15 px-3 outline-none"
                        >
                          <option value="english">English (US)</option>
                          <option value="spanish">Español (ES)</option>
                          <option value="french">Français (FR)</option>
                        </select>
                      </div>

                      {/* Date Format */}
                      <div className="flex flex-col gap-1.5">
                        <label className="font-bold text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Date Format
                        </label>
                        <select
                          value={dateFormat}
                          onChange={(e) => setDateFormat(e.target.value)}
                          className="h-10 rounded-lg border border-border bg-secondary/15 px-3 outline-none"
                        >
                          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Tab 4: Notifications Preference Toggles */}
            {activeTab === "notifications" && (
              <motion.div
                key="tab-notifications"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="max-w-2xl select-none text-left"
              >
                <Card className="border-border/80 bg-card/45">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Bell className="h-5 w-5 text-indigo-400" />
                      Delivery Preferences
                    </CardTitle>
                    <CardDescription>
                      Configure notification delivery options shared across alerts tab dashboard.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 text-xs">
                    
                    {/* Delivery Channels */}
                    <div className="space-y-4">
                      <h4 className="font-bold text-foreground pb-1.5 border-b border-border/40 text-xs flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-indigo-400" />
                        Delivery Channels
                      </h4>
                      
                      {/* Email */}
                      <div className="flex items-center justify-between p-3.5 border border-border bg-card/30 rounded-xl">
                        <div className="space-y-0.5">
                          <h5 className="font-extrabold text-foreground flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            Email Dispatcher
                          </h5>
                          <p className="text-[10px] text-muted-foreground">Send weekly summaries and critical warning logs.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={prefEmail}
                          onChange={(e) => setPrefEmail(e.target.checked)}
                          className="h-4.5 w-4.5 accent-accent"
                        />
                      </div>

                      {/* Push */}
                      <div className="flex items-center justify-between p-3.5 border border-border bg-card/30 rounded-xl">
                        <div className="space-y-0.5">
                          <h5 className="font-extrabold text-foreground flex items-center gap-1.5">
                            <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                            Push Notifications
                          </h5>
                          <p className="text-[10px] text-muted-foreground">Trigger browser alerts immediately when scans finish.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={prefPush}
                          onChange={(e) => setPrefPush(e.target.checked)}
                          className="h-4.5 w-4.5 accent-accent"
                        />
                      </div>

                      {/* SMS */}
                      <div className="flex items-center justify-between p-3.5 border border-border bg-card/30 rounded-xl">
                        <div className="space-y-0.5">
                          <h5 className="font-extrabold text-foreground flex items-center gap-1.5">
                            <PhoneCall className="h-3.5 w-3.5 text-muted-foreground" />
                            SMS text alerts
                          </h5>
                          <p className="text-[10px] text-muted-foreground">Send emergency texts directly to your phone.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={prefSms}
                          onChange={(e) => setPrefSms(e.target.checked)}
                          className="h-4.5 w-4.5 accent-accent"
                        />
                      </div>

                      {/* In-app */}
                      <div className="flex items-center justify-between p-3.5 border border-border bg-card/30 rounded-xl">
                        <div className="space-y-0.5">
                          <h5 className="font-extrabold text-foreground flex items-center gap-1.5">
                            <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                            In-App Alerts
                          </h5>
                          <p className="text-[10px] text-muted-foreground">Display badge counter markers in the layout bar.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={prefInApp}
                          onChange={(e) => setPrefInApp(e.target.checked)}
                          className="h-4.5 w-4.5 accent-accent"
                        />
                      </div>
                    </div>

                    {/* Timing Configs */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Reminder Frequency</label>
                        <select
                          value={prefFrequency}
                          onChange={(e) => setPrefFrequency(e.target.value)}
                          className="w-full h-10 rounded-lg border border-border bg-secondary/20 px-3 text-xs text-foreground outline-none"
                        >
                          <option value="daily">Daily scans summary</option>
                          <option value="weekly">Weekly digest scans</option>
                          <option value="monthly">Monthly audit logs</option>
                        </select>
                      </div>

                      {/* Quiet Hours */}
                      <div className="flex flex-col gap-2 p-3 border border-border bg-card/10 rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            Quiet Hours
                          </span>
                          <input
                            type="checkbox"
                            checked={prefQuietHours}
                            onChange={(e) => setPrefQuietHours(e.target.checked)}
                            className="h-4.5 w-4.5 accent-accent"
                          />
                        </div>
                        <p className="text-[9px] text-muted-foreground">
                          Mute SMS or email warnings from 10:00 PM to 7:00 AM local time.
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-border/20">
                      <Button onClick={handleSaveNotifications} className="bg-accent hover:bg-accent/80 text-white">
                        Save Preferences
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Tab 5: Roles & Permissions badges */}
            {activeTab === "permissions" && (
              <motion.div
                key="tab-permissions"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6 text-left"
              >
                <Card className="bg-card/45 border-border/80">
                  <CardHeader className="pb-3 border-b border-border/25">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                        <Layers className="h-4.5 w-4.5 text-indigo-400" />
                        Role Scope Permissions
                      </CardTitle>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-bold text-indigo-400 border border-indigo-500/20 uppercase select-none">
                        {((user as unknown as Record<string, unknown>)?.role as string) || "FAMILY_OWNER"}
                      </span>
                    </div>
                    <CardDescription className="text-[10px]">
                      Displays authorization privileges assigned to your workspace profile.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4 text-xs">
                    
                    <div className="p-3 border border-border/60 bg-secondary/15 rounded-xl flex items-center gap-3">
                      <Lock className="h-5 w-5 text-indigo-400 shrink-0" />
                      <div className="space-y-0.5">
                        <h5 className="font-extrabold text-foreground">Workspace Administrative Access</h5>
                        <p className="text-[10px] text-muted-foreground">
                          Your assigned profile role grants administrative controls over documents vault scanners, OCR tools, and family member details.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3.5 pt-2">
                      <h5 className="font-bold text-foreground pb-1.5 border-b border-border/40 uppercase text-[10px]">Active Permission Scopes</h5>
                      
                      <div className="grid gap-4 sm:grid-cols-2">
                        {/* Scope 1 */}
                        <div className="p-3 border border-border bg-card/30 rounded-xl space-y-1">
                          <span className="text-[9px] text-emerald-500 font-extrabold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full select-none">
                            Read/Write Allowed
                          </span>
                          <h6 className="font-bold text-foreground pt-1.5">Digital Vault Actions</h6>
                          <p className="text-[10px] text-muted-foreground leading-normal">
                            Upload, zoom, rotate, download, and soft-delete files in the digital vault.
                          </p>
                        </div>

                        {/* Scope 2 */}
                        <div className="p-3 border border-border bg-card/30 rounded-xl space-y-1">
                          <span className="text-[9px] text-emerald-500 font-extrabold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full select-none">
                            Granted
                          </span>
                          <h6 className="font-bold text-foreground pt-1.5">AI grounding execution</h6>
                          <p className="text-[10px] text-muted-foreground leading-normal">
                            Execute chats with AI assistant grounded in vault files, assessments, and OCR parameters.
                          </p>
                        </div>

                        {/* Scope 3 */}
                        <div className="p-3 border border-border bg-card/30 rounded-xl space-y-1">
                          <span className="text-[9px] text-emerald-500 font-extrabold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full select-none">
                            Full Control
                          </span>
                          <h6 className="font-bold text-foreground pt-1.5">Readiness Auditing</h6>
                          <p className="text-[10px] text-muted-foreground leading-normal">
                            Create readiness milestones assessments and scan expiration timelines.
                          </p>
                        </div>

                        {/* Scope 4 */}
                        <div className="p-3 border border-border bg-card/30 rounded-xl space-y-1">
                          <span className="text-[9px] text-emerald-500 font-extrabold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full select-none">
                            Allowed
                          </span>
                          <h6 className="font-bold text-foreground pt-1.5">Workspaces Management</h6>
                          <p className="text-[10px] text-muted-foreground leading-normal">
                            Create, switch, edit, and delete family workspaces, adding or removing members.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>

    </PageContainer>
  );
}
