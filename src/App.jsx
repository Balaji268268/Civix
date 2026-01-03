import React, { useEffect, useState, Suspense, lazy } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { SignIn, SignUp, useAuth } from '@clerk/clerk-react';
import { AnimatePresence } from 'framer-motion';

import Home from './Home';
import Login from './components/Login';
import Signup from './components/Signup';
// ... imports
import PortalGuard from './components/PortalGuard';

// ... lazy loads
import UserDashboard from './Pages/UserDashboard';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import PageLoader from './components/PageLoader';
import ScrollToTopOnRouteChange from './components/ScrollToTopOnRouteChange';
import { HelmetProvider } from 'react-helmet-async';
// import CustomCursor from './components/CustomCursor';
import CivixSupportBot from './components/Chatbot/CivixSupportBot';

const OfficerDashboard = lazy(() => import('./Pages/OfficerDashboard'));
const ModeratorDashboard = lazy(() => import('./Pages/ModeratorDashboard'));
const CommunityHub = lazy(() => import('./Pages/CommunityHub'));

// ...



// Standard Imports for lighter pages (to avoid layout shift on simple clicks)
const RequireAdmin = lazy(() => import('./components/auth/RequireAdmin'));
const DuplicateIssues = lazy(() => import('./Pages/DuplicateIssues'));
const AdminAllIssues = lazy(() => import('./Pages/AdminAllIssues'));
const AdminMessages = lazy(() => import('./Pages/AdminMessages'));
const Feedback = lazy(() => import("./Pages/Feedback"));
const About = lazy(() => import('./Pages/About'));
const Privacy = lazy(() => import('./Pages/Privacy'));
const Terms = lazy(() => import('./Pages/Terms'));
const Contact = lazy(() => import('./Pages/Contact'));
const ReportIssue = lazy(() => import('./Pages/ReportIssue'));
const ServerError = lazy(() => import('./components/ServerError'));
const DownloadAndroid = lazy(() => import('./Pages/DownloadAndroid'));
const DownloadIOS = lazy(() => import('./Pages/DownloadIOS'));
const NewIssue = lazy(() => import('./Pages/NewIssue'));
const CommunityVotingPage = lazy(() => import('./Pages/CommunityVotingPage'));
const Profile = lazy(() => import('./Pages/Profile'));
const ProfileSetup = lazy(() => import('./Pages/ProfileSetup'));
const Resources = lazy(() => import('./Pages/Resources'));
const MyComplaints = lazy(() => import('./Pages/MyComplaints'));
const CivicEducation = lazy(() => import('./Pages/CivicEducation'));
const CivicSimulator = lazy(() => import('./Pages/CivicSimulator'));
const SOS = lazy(() => import('./Pages/SOS'));
const TaxImpact = lazy(() => import('./Pages/TaxImpact'));
const RepersentativeFinder = lazy(() => import('./Pages/RepersentativeFinder'));
const Users = lazy(() => import('./Pages/Users'));
const AdminUserDetails = lazy(() => import('./Pages/AdminUserDetails'));
const UserPosts = lazy(() => import('./Pages/UserPosts'));
const Settings = lazy(() => import('./Pages/Settings'));
const Notification = lazy(() => import('./Pages/Notification'));
const NearbyServices = lazy(() => import('./Pages/NearbyServices'));
const LostAndFoundPage = lazy(() => import('./Pages/Lost&Found'));
const CommunityHolidays = lazy(() => import('./Pages/CommunityHolidays'));
const Transport = lazy(() => import('./Pages/Transport'));
const CivicStatistics = lazy(() => import('./Pages/CivicStatistics'));
const Election = lazy(() => import('./Pages/Election'));
const Schemes = lazy(() => import('./Pages/Schemes'));
const Vehical = lazy(() => import('./Pages/Vehical'));
const MedicalInfo = lazy(() => import('./Pages/MedicalInfo'));
const Electricity = lazy(() => import('./Pages/Electricity'));
const SafeWord = lazy(() => import('./Pages/SafeWord'));
const RecordAudio = lazy(() => import('./Pages/RecordAudio'));
const SDRF = lazy(() => import('./Pages/SDRF'));
const Budget = lazy(() => import('./Pages/Budget'));
const AirSeva = lazy(() => import('./Pages/AirSeva'));
const Train = lazy(() => import('./Pages/Train'));
const School = lazy(() => import('./Pages/School'));
const Sitemap = lazy(() => import('./Pages/Sitemap'));
const IssueDetail = lazy(() => import('./Pages/IssueDetail'));
const AdminIssueDetail = lazy(() => import('./Pages/AdminIssueDetail'));
const VotingSystem = lazy(() => import('./Pages/VotingSystem'));
const UserMap = lazy(() => import('./Pages/UserMap'));
const Chatroom = lazy(() => import('./Pages/Chatroom'));
const Analytics = lazy(() => import('./Pages/Analytics'));
const Documents = lazy(() => import('./Pages/Documents'));
const AdminDashboard = lazy(() => import('./Pages/AdminDashboard'));
const AdminEvents = lazy(() => import('./Pages/AdminEvents'));

const OfficerSettings = lazy(() => import('./Pages/OfficerSettings'));
const ModeratorSettings = lazy(() => import('./Pages/ModeratorSettings'));
const Error404 = lazy(() => import('./components/Error404'));



const App = () => {
  const { isSignedIn, userId, getToken } = useAuth();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin") || location.pathname.startsWith("/officer") || location.pathname.startsWith("/moderator");
  const [isProfileComplete, setIsProfileComplete] = useState(() => {
    return localStorage.getItem("profileComplete") === "true";
  });
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);
  const [hasCheckedProfile, setHasCheckedProfile] = useState(false);

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

          const response = await fetch(`http://localhost:5000/api/profile/${userId}`, {
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

  const renderDashboard = () => {
    if (!isSignedIn) return <Navigate to="/login" replace />;

    if (!hasCheckedProfile || isCheckingProfile) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            <p className="text-gray-500 animate-pulse">Verifying Citizen Profile...</p>
          </div>
        </div>
      );
    }

    if (!isProfileComplete) {
      return <Navigate to="/profile-setup" replace />;
    }

    return (
      <PortalGuard allowedRoles={['user']}>
        <UserDashboard />
      </PortalGuard>
    );
  };

  return (
    <HelmetProvider>
      {/* <CustomCursor /> */}
      <CivixSupportBot />
      <ScrollToTop />
      <ScrollToTopOnRouteChange />
      {!isAdminRoute && <Navbar />}

      <AnimatePresence mode="wait">
        <Suspense fallback={<PageLoader />}>
          <Routes location={location} key={location.pathname}>


            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login/*" element={<Login />} />
            <Route path="/signup/*" element={<Signup />} />
            <Route path="/report-issue" element={<ReportIssue />} />
            <Route path="/download-android" element={<DownloadAndroid />} />
            <Route path="/download-ios" element={<DownloadIOS />} />
            <Route path="/issues/new" element={<NewIssue />} />

            <Route path="/civic-education" element={<CivicEducation />} />
            <Route path="/civic-simulator" element={<CivicSimulator />} />
            <Route path="/community-voting" element={<CommunityVotingPage />} />
            <Route path="/voting-system" element={<VotingSystem />} />
            <Route path="/user/dashboard" element={renderDashboard()} />

            <Route
              path="/community"
              element={
                <PortalGuard allowedRoles={['user', 'admin', 'moderator', 'officer']}>
                  <CommunityHub />
                </PortalGuard>
              }
            />

            {/* Officer Portal */}
            <Route
              path="/officer/*"
              element={
                <PortalGuard allowedRoles={['officer']}>
                  <OfficerDashboard />
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
                  <ModeratorDashboard />
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

            <Route
              path="/profile"
              element={
                <PortalGuard allowedRoles={['user', 'admin']}>
                  <Profile />
                </PortalGuard>
              }
            />
            <Route path='/electricity' element={<Electricity />} />
            <Route path='/budget' element={<Budget />} />
            <Route path='/train' element={<Train />} />
            <Route path='/school' element={<School />} />

            <Route path='/user-map' element={<UserMap />} />
            <Route
              path="/profile-setup"
              element={
                <PortalGuard allowedRoles={['user', 'admin']}>
                  <ProfileSetup onComplete={() => setIsProfileComplete(true)} />
                </PortalGuard>
              }
            />

            <Route path="/resources" element={<Resources />} />
            <Route path="/complaints" element={<MyComplaints />} />
            <Route path="/sos" element={<SOS />} />
            <Route path='/chatroom' element={<Chatroom />} />
            <Route path='/tax-impact' element={<TaxImpact />} />
            <Route path="/medical-info" element={<MedicalInfo />} />
            <Route path="/safe-word" element={<SafeWord />} />
            <Route path="/record-audio" element={<RecordAudio />} />
            <Route path='/repersentative-finder' element={<RepersentativeFinder />} />
            <Route path='/admin/analytics' element={<Analytics />} />
            <Route path='/admin/users' element={<Users />} />
            <Route path='/admin/documents' element={<Documents />} />
            <Route path='/admin/settings' element={<Settings />} />
            <Route path='/admin/notifications' element={<Notification />} />
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

            {/* New Routes */}
            <Route
              path='/admin/users/:id'
              element={
                <PortalGuard allowedRoles={['admin']}>
                  <AdminUserDetails />
                </PortalGuard>
              }
            />
            <Route
              path='/user/posts'
              element={
                <PortalGuard allowedRoles={['user', 'admin']}>
                  <UserPosts />
                </PortalGuard>
              }
            />

            <Route
              path="/issues/:id"
              element={
                <PortalGuard allowedRoles={['user', 'admin']}>
                  <IssueDetail />
                </PortalGuard>
              }
            />
            <Route
              path="/admin"
              element={
                <PortalGuard allowedRoles={['admin']}>
                  <AdminDashboard />
                </PortalGuard>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <PortalGuard allowedRoles={['admin']}>
                  <AdminDashboard />
                </PortalGuard>
              }
            />
            <Route
              path="/admin/issues/:id"
              element={
                <PortalGuard allowedRoles={['admin']}>
                  <AdminIssueDetail />
                </PortalGuard>
              }
            />
            <Route
              path="/admin/duplicates"
              element={
                <PortalGuard allowedRoles={['admin']}>
                  <DuplicateIssues />
                </PortalGuard>
              }
            />
            <Route
              path="/admin/issues"
              element={
                <PortalGuard allowedRoles={['admin']}>
                  <AdminAllIssues />
                </PortalGuard>
              }
            />
            <Route
              path="/admin/messages"
              element={
                <PortalGuard allowedRoles={['admin']}>
                  <AdminMessages />
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
              path="/my-complaints"
              element={
                <PortalGuard allowedRoles={['user', 'admin']}>
                  <MyComplaints />
                </PortalGuard>
              }
            />

            {/* Errors */}
            <Route path="/500" element={<ServerError />} />
            <Route path="*" element={<Error404 />} />
          </Routes>
        </Suspense>
      </AnimatePresence>
      {!isAdminRoute && <Footer />}
      <Toaster />
    </HelmetProvider>
  );
};

export default App;
