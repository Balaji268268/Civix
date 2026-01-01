import React, { useEffect, useState, Suspense, lazy } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { SignIn, SignUp, useAuth } from '@clerk/clerk-react';
import { AnimatePresence } from 'framer-motion';
import csrfManager from './utils/csrfManager';

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

const OfficerDashboard = lazy(() => import('./Pages/OfficerDashboard'));
const ModeratorDashboard = lazy(() => import('./Pages/ModeratorDashboard'));

// ...



// Standard Imports for lighter pages (to avoid layout shift on simple clicks)
import RequireProfile from './components/auth/RequireProfile';
import RequireAdmin from './components/auth/RequireAdmin';
import DuplicateIssues from './Pages/DuplicateIssues';
import AdminAllIssues from './Pages/AdminAllIssues';
import AdminMessages from './Pages/AdminMessages';
import Feedback from "./Pages/Feedback";
import About from './Pages/About';
import Privacy from './Pages/Privacy';
import Terms from './Pages/Terms';
import Contact from './Pages/Contact';
import ReportIssue from './Pages/ReportIssue';
import ServerError from './components/ServerError';
import DownloadAndroid from './Pages/DownloadAndroid';
import DownloadIOS from './Pages/DownloadIOS';
import NewIssue from './Pages/NewIssue';
import CommunityVotingPage from './Pages/CommunityVotingPage';
import Profile from './Pages/Profile';
import ProfileSetup from './Pages/ProfileSetup';
import Resources from './Pages/Resources';
import MyComplaints from './Pages/MyComplaints';
import CivicEducation from './Pages/CivicEducation';
import CivicSimulator from './Pages/CivicSimulator';
import Contributors from './Pages/Contributors';
import SOS from './Pages/SOS';
import TaxImpact from './Pages/TaxImpact';
import RepersentativeFinder from './Pages/RepersentativeFinder';
import Users from './Pages/Users';
import AdminUserDetails from './Pages/AdminUserDetails';
import UserPosts from './Pages/UserPosts';
import Settings from './Pages/Settings';
import Notification from './Pages/Notification';
import NearbyServices from './Pages/NearbyServices';
import LostAndFoundPage from './Pages/Lost&Found';
import CommunityHolidays from './Pages/CommunityHolidays';
import Transport from './Pages/Transport';
import CivicStatistics from './Pages/CivicStatistics'
import Election from './Pages/Election';
import Schemes from './Pages/Schemes';
import Vehical from './Pages/Vehical';
import MedicalInfo from './Pages/MedicalInfo';
import Electricity from './Pages/Electricity';
import SafeWord from './Pages/SafeWord';
import RecordAudio from './Pages/RecordAudio';
import SDRF from './Pages/SDRF';
import Budget from './Pages/Budget';
import AirSeva from './Pages/AirSeva';
import Train from './Pages/Train';
import School from './Pages/School';
import Sitemap from './Pages/Sitemap';
import IssueDetail from './Pages/IssueDetail';
import AdminIssueDetail from './Pages/AdminIssueDetail';
import VotingSystem from './Pages/VotingSystem';
import UserMap from './Pages/UserMap';
import Chatroom from './Pages/Chatroom';
import Analytics from './Pages/Analytics';
import Documents from './Pages/Documents';
import AdminDashboard from './Pages/AdminDashboard';
import Error404 from './components/Error404';



const App = () => {
  const { isSignedIn, userId, getToken } = useAuth();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");
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
      // Pass the current location (or existing state) so ProfileSetup knows where to go back to
      return <Navigate to="/profile-setup" state={{ from: location.state?.from || location }} replace />;
    }

    return (
      <PortalGuard allowedRoles={['user']}>
        <UserDashboard />
      </PortalGuard>
    );
  };

  return (
    <>
      <ScrollToTop />
      <ScrollToTopOnRouteChange />
      {!isAdminRoute && <Navbar />}

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
          <Route path="/issues/:id" element={<IssueDetail />} />
          <Route path="/civic-education" element={<CivicEducation />} />
          <Route path="/civic-simulator" element={<CivicSimulator />} />
          <Route path="/community-voting" element={<CommunityVotingPage />} />
          <Route path="/voting-system" element={<VotingSystem />} />
          <Route
            path="/user/dashboard"
            element={
              <PortalGuard allowedRoles={['user']}>
                <UserDashboard />
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
          <Route path="/contributors" element={<Contributors />} />
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
      </AnimatePresence>
      {!isAdminRoute && <Footer />}
      <Toaster />
    </>
  );
};

export default App;
