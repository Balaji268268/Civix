import React, { useEffect, useState, Suspense, lazy } from 'react';
import lazyRetry from './utils/lazyRetry'; // Import chunk retry utility
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '@clerk/clerk-react';
import { AnimatePresence } from 'framer-motion';
import csrfManager from './utils/csrfManager';

// Critical Statically Loaded Pages (For instant LCP)
import Home from './Home';
import Login from './components/Login';
import Signup from './components/Signup';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import ScrollToTopOnRouteChange from './components/ScrollToTopOnRouteChange';
import { HelmetProvider } from 'react-helmet-async';
import CivixSupportBot from './components/Chatbot/CivixSupportBot';
import PageLoader from './components/PageLoader';
import PortalGuard from './components/PortalGuard';
import RequireProfile from './components/auth/RequireProfile';
import CustomCursor from './components/CustomCursor';
import UserGuideModal from './components/UserGuideModal'; // NEW IMPORT

// Lazy Loaded Pages (Code Split)
const UserDashboard = lazyRetry(() => import('./Pages/UserDashboard'));
const OfficerDashboard = lazyRetry(() => import('./Pages/OfficerDashboard'));
const ModeratorDashboard = lazyRetry(() => import('./Pages/ModeratorDashboard'));
const CommunityHub = lazyRetry(() => import('./Pages/CommunityHub'));
const AdminDashboard = lazyRetry(() => import('./Pages/AdminDashboard'));

// Standard Imports for lighter pages (to avoid layout shift on simple clicks)
const RequireAdmin = lazyRetry(() => import('./components/auth/RequireAdmin'));
const DuplicateIssues = lazyRetry(() => import('./Pages/DuplicateIssues'));
const AdminAllIssues = lazyRetry(() => import('./Pages/AdminAllIssues'));
const AdminMessages = lazyRetry(() => import('./Pages/AdminMessages'));
const Feedback = lazyRetry(() => import("./Pages/Feedback"));
const About = lazyRetry(() => import('./Pages/About'));
const Privacy = lazyRetry(() => import('./Pages/Privacy'));
const Terms = lazyRetry(() => import('./Pages/Terms'));
const Contact = lazyRetry(() => import('./Pages/Contact'));
const ReportIssue = lazyRetry(() => import('./Pages/ReportIssue'));
const ServerError = lazyRetry(() => import('./components/ServerError'));
const DownloadAndroid = lazyRetry(() => import('./Pages/DownloadAndroid'));
const DownloadIOS = lazyRetry(() => import('./Pages/DownloadIOS'));
const NewIssue = lazyRetry(() => import('./Pages/NewIssue'));
const CommunityVotingPage = lazyRetry(() => import('./Pages/CommunityVotingPage'));
const Profile = lazyRetry(() => import('./Pages/Profile'));
// const ProfileSetup = lazy(() => import('./Pages/ProfileSetup'));
const Resources = lazyRetry(() => import('./Pages/Resources'));
const MyComplaints = lazyRetry(() => import('./Pages/MyComplaints'));
const CivicEducation = lazyRetry(() => import('./Pages/CivicEducation'));
const CivicSimulator = lazyRetry(() => import('./Pages/CivicSimulator'));

const SOS = lazyRetry(() => import('./Pages/SOS'));
const TaxImpact = lazyRetry(() => import('./Pages/TaxImpact'));
const RepersentativeFinder = lazyRetry(() => import('./Pages/RepersentativeFinder'));
const Users = lazyRetry(() => import('./Pages/Admin/UserManagement'));
const AdminUserDetails = lazyRetry(() => import('./Pages/AdminUserDetails'));
const UserPosts = lazyRetry(() => import('./Pages/UserPosts'));
const Settings = lazyRetry(() => import('./Pages/Settings'));
const Notification = lazyRetry(() => import('./Pages/Notification'));
const NearbyServices = lazyRetry(() => import('./Pages/NearbyServices'));
const LostAndFoundPage = lazyRetry(() => import('./Pages/Lost&Found'));
const CommunityHolidays = lazyRetry(() => import('./Pages/CommunityHolidays'));
const Transport = lazyRetry(() => import('./Pages/Transport'));
const CivicStatistics = lazyRetry(() => import('./Pages/CivicStatistics'));
const Election = lazyRetry(() => import('./Pages/Election'));
const Schemes = lazyRetry(() => import('./Pages/Schemes'));
const Vehical = lazyRetry(() => import('./Pages/Vehical'));
const MedicalInfo = lazyRetry(() => import('./Pages/MedicalInfo'));
const Electricity = lazyRetry(() => import('./Pages/Electricity'));
const SafeWord = lazyRetry(() => import('./Pages/SafeWord'));
const RecordAudio = lazyRetry(() => import('./Pages/RecordAudio'));
const SDRF = lazyRetry(() => import('./Pages/SDRF'));
const Budget = lazyRetry(() => import('./Pages/Budget'));
const AirSeva = lazyRetry(() => import('./Pages/AirSeva'));
const Train = lazyRetry(() => import('./Pages/Train'));
const School = lazyRetry(() => import('./Pages/School'));
const Sitemap = lazyRetry(() => import('./Pages/Sitemap'));
const IssueDetail = lazyRetry(() => import('./Pages/IssueDetail'));
const AdminIssueDetail = lazyRetry(() => import('./Pages/AdminIssueDetail'));
const VotingSystem = lazyRetry(() => import('./Pages/VotingSystem'));
const UserMap = lazyRetry(() => import('./Pages/UserMap'));
const Chatroom = lazyRetry(() => import('./Pages/Chatroom'));
const Analytics = lazyRetry(() => import('./Pages/Analytics'));
const Documents = lazyRetry(() => import('./Pages/Documents'));
const AdminEvents = lazyRetry(() => import('./Pages/AdminEvents'));
const OfficerSettings = lazyRetry(() => import('./Pages/OfficerSettings'));
const ModeratorSettings = lazyRetry(() => import('./Pages/ModeratorSettings'));
const Error404 = lazyRetry(() => import('./components/Error404'));

const App = () => {
  const { isSignedIn, userId, getToken } = useAuth();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin") || location.pathname.startsWith("/officer") || location.pathname.startsWith("/moderator");
  const [isProfileComplete, setIsProfileComplete] = useState(() => {
    return localStorage.getItem("profileComplete") === "true";
  });
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);
  const [hasCheckedProfile, setHasCheckedProfile] = useState(false);
  const [showGuide, setShowGuide] = useState(false); // NEW STATE

  useEffect(() => {
    // Keep sync with localStorage in case it changes elsewhere
    const handleStorageChange = () => {
      setIsProfileComplete(localStorage.getItem("profileComplete") === "true");
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Initialize Theme from Local Storage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // NEW EFFECT FOR GUIDE
  useEffect(() => {
    if (isSignedIn && !localStorage.getItem("hasSeenGuide")) {
      setShowGuide(true);
    }
  }, [isSignedIn]);

  // Check backend for profile status if localStorage says false but user is signed in
  useEffect(() => {
    let isMounted = true;
    const verifyProfileOnBackend = async () => {
      // If we already think profile is complete, we don't need to check
      if (isProfileComplete) {
        if (isMounted) setHasCheckedProfile(true);
        return;
      }

      if (!isSignedIn) {
        if (isMounted) setHasCheckedProfile(true);
        return;
      }

      if (isSignedIn && userId && !isProfileComplete) {
        setIsCheckingProfile(true);
        try {
          const token = await getToken();
          if (!token) {
            if (isMounted) { setIsCheckingProfile(false); setHasCheckedProfile(true); }
            return;
          }

          const response = await csrfManager.secureFetch(`/api/profile/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (response.ok) {
            const data = await response.json();
            // Use actual backend flag if available, fallback to email check
            const isComplete = data.isProfileComplete || (data && data.email && data.name && data.location);

            if (isComplete) {
              if (isMounted) {
                setIsProfileComplete(true);
                localStorage.setItem("profileComplete", "true");
              }
            }
          }
        } catch (error) {
          console.error("Profile check failed:", error);
        } finally {
          if (isMounted) {
            setIsCheckingProfile(false);
            setHasCheckedProfile(true);
          }
        }
      }
    };

    verifyProfileOnBackend();
    return () => { isMounted = false; };
  }, [isSignedIn, isProfileComplete, userId, getToken]);

  return (
    <HelmetProvider>
      <CustomCursor />
      <CivixSupportBot />
      <ScrollToTop />
      <ScrollToTopOnRouteChange />

      {showGuide && <UserGuideModal onComplete={() => setShowGuide(false)} />}

      {!isAdminRoute && <Navbar />}

      <Suspense fallback={<PageLoader />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>

            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login/*" element={<Login />} />
            <Route path="/signup/*" element={<Signup />} />

            <Route
              path="/report-issue"
              element={
                <RequireProfile>
                  <ReportIssue />
                </RequireProfile>
              }
            />
            <Route path="/download-android" element={<DownloadAndroid />} />
            <Route path="/download-ios" element={<DownloadIOS />} />
            <Route
              path="/issues/new"
              element={
                <RequireProfile>
                  <NewIssue />
                </RequireProfile>
              }
            />

            <Route path="/civic-education" element={<CivicEducation />} />
            <Route path="/civic-simulator" element={<CivicSimulator />} />
            <Route path="/community-voting" element={<CommunityVotingPage />} />
            <Route path="/voting-system" element={<VotingSystem />} />

            {/* Community Hub - Protected */}
            <Route
              path="/community"
              element={
                <PortalGuard allowedRoles={['user', 'admin', 'moderator', 'officer']}>
                  <CommunityHub />
                </PortalGuard>
              }
            />

            <Route
              path="/user/dashboard"
              element={
                <PortalGuard allowedRoles={['user']}>
                  <RequireProfile>
                    <UserDashboard />
                  </RequireProfile>
                </PortalGuard>
              }
            />

            {/* Officer Portal */}
            <Route
              path="/officer/*"
              element={
                <PortalGuard allowedRoles={['officer']}>
                  <RequireProfile>
                    <OfficerDashboard />
                  </RequireProfile>
                </PortalGuard>
              }
            />
            <Route
              path="/officer/settings"
              element={
                <PortalGuard allowedRoles={['officer']}>
                  <OfficerSettings />
                </PortalGuard>
              }
            />

            {/* Moderator Portal */}
            <Route
              path="/moderator/*"
              element={
                <PortalGuard allowedRoles={['moderator']}>
                  <RequireProfile>
                    <ModeratorDashboard />
                  </RequireProfile>
                </PortalGuard>
              }
            />
            <Route
              path="/moderator/settings"
              element={
                <PortalGuard allowedRoles={['moderator']}>
                  <ModeratorSettings />
                </PortalGuard>
              }
            />

            {/* Admin Portal - Protected */}
            <Route
              path="/admin"
              element={
                <PortalGuard allowedRoles={['admin']}>
                  <RequireProfile>
                    <AdminDashboard />
                  </RequireProfile>
                </PortalGuard>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <PortalGuard allowedRoles={['admin']}>
                  <RequireProfile>
                    <AdminDashboard />
                  </RequireProfile>
                </PortalGuard>
              }
            />
            <Route
              path="/admin/issues/:id"
              element={
                <PortalGuard allowedRoles={['admin']}>
                  <RequireProfile>
                    <AdminIssueDetail />
                  </RequireProfile>
                </PortalGuard>
              }
            />
            <Route
              path="/admin/issues"
              element={
                <PortalGuard allowedRoles={['admin']}>
                  <RequireProfile>
                    <AdminAllIssues />
                  </RequireProfile>
                </PortalGuard>
              }
            />
            <Route
              path="/admin/users"
              element={
                <PortalGuard allowedRoles={['admin']}>
                  <Users />
                </PortalGuard>
              }
            />
            {/* Admin new routes */}
            <Route
              path='/admin/users/:id'
              element={
                <PortalGuard allowedRoles={['admin']}>
                  <RequireProfile>
                    <AdminUserDetails />
                  </RequireProfile>
                </PortalGuard>
              }
            />
            <Route
              path="/admin/messages"
              element={
                <PortalGuard allowedRoles={['admin']}>
                  <RequireProfile>
                    <AdminMessages />
                  </RequireProfile>
                </PortalGuard>
              }
            />
            <Route
              path="/admin/events"
              element={
                <PortalGuard allowedRoles={['admin']}>
                  <AdminEvents />
                </PortalGuard>
              }
            />
            <Route
              path="/admin/duplicates"
              element={
                <PortalGuard allowedRoles={['admin']}>
                  <RequireProfile>
                    <DuplicateIssues />
                  </RequireProfile>
                </PortalGuard>
              }
            />
            <Route path='/admin/analytics' element={<Analytics />} />
            <Route path='/admin/documents' element={<Documents />} />
            <Route path='/admin/settings' element={<Settings />} />
            <Route path='/admin/notifications' element={<Notification />} />

            {/* Profile */}
            <Route
              path="/profile"
              element={
                <PortalGuard allowedRoles={['user', 'admin']}>
                  <RequireProfile>
                    <Profile />
                  </RequireProfile>
                </PortalGuard>
              }
            />

            {/* Profile Setup - DISABLED/REMOVED */}
            {/* <Route
              path="/profile-setup"
              element={
                <PortalGuard allowedRoles={['user', 'admin']}>
                  <ProfileSetup onComplete={() => setIsProfileComplete(true)} />
                </PortalGuard>
              }
            /> */}

            {/* Misc Public/User Routes */}
            <Route path='/electricity' element={<Electricity />} />
            <Route path='/budget' element={<Budget />} />
            <Route path='/train' element={<Train />} />
            <Route path='/school' element={<School />} />
            <Route path='/user-map' element={<UserMap />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/complaints" element={<MyComplaints />} />
            <Route path="/my-complaints" element={<MyComplaints />} />

            <Route path="/sos" element={<SOS />} />
            <Route path='/chatroom' element={<Chatroom />} />
            <Route path='/tax-impact' element={<TaxImpact />} />
            <Route path="/medical-info" element={<MedicalInfo />} />
            <Route path="/safe-word" element={<SafeWord />} />
            <Route path="/record-audio" element={<RecordAudio />} />
            <Route path='/repersentative-finder' element={<RepersentativeFinder />} />
            <Route path='/nearby-services' element={<NearbyServices />} />
            <Route path='/lost-found' element={<LostAndFoundPage />} />
            <Route path='/community-holidays' element={<CommunityHolidays />} />
            <Route path='/transport' element={<Transport />} />
            <Route path='/civic-stats' element={<CivicStatistics />} />
            <Route path='/elections-info' element={<Election />} />
            <Route path='/govt-schemes' element={<Schemes />} />
            <Route path='/vehical' element={<Vehical />} />
            <Route path='/sdrf' element={<SDRF />} />
            <Route path='/airseva' element={<AirSeva />} />
            <Route path='/sitemap' element={<Sitemap />} />

            <Route
              path='/user/posts'
              element={
                <PortalGuard allowedRoles={['user', 'admin']}>
                  <RequireProfile>
                    <UserPosts />
                  </RequireProfile>
                </PortalGuard>
              }
            />

            <Route
              path="/issues/:id"
              element={
                <PortalGuard allowedRoles={['user', 'admin']}>
                  <RequireProfile>
                    <IssueDetail />
                  </RequireProfile>
                </PortalGuard>
              }
            />

            {/* Errors */}
            <Route path="/500" element={<ServerError />} />
            <Route path="*" element={<Error404 />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
      {!isAdminRoute && <Footer />}
      <Toaster />
    </HelmetProvider>
  );
};

export default App;
