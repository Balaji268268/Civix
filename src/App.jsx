import React, { useEffect, useState, Suspense, lazy } from 'react';
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
import PageLoader from './components/PageLoader';
import PortalGuard from './components/PortalGuard';
import RequireProfile from './components/auth/RequireProfile';

// Lazy Loaded Pages (Code Split)
const UserDashboard = lazy(() => import('./Pages/UserDashboard'));
const OfficerDashboard = lazy(() => import('./Pages/OfficerDashboard'));
const ModeratorDashboard = lazy(() => import('./Pages/ModeratorDashboard'));
const AdminDashboard = lazy(() => import('./Pages/AdminDashboard'));
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
const Contributors = lazy(() => import('./Pages/Contributors'));
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
const Error404 = lazy(() => import('./components/Error404'));



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



  return (
    <>
      <ScrollToTop />
      <ScrollToTopOnRouteChange />
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
            <Route path="/issues/:id" element={<IssueDetail />} />
            <Route path="/civic-education" element={<CivicEducation />} />
            <Route path="/civic-simulator" element={<CivicSimulator />} />
            <Route path="/community-voting" element={<CommunityVotingPage />} />
            <Route path="/voting-system" element={<VotingSystem />} />

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
              path="/profile"
              element={
                <PortalGuard allowedRoles={['user', 'admin']}>
                  <RequireProfile>
                    <Profile />
                  </RequireProfile>
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
                  <RequireProfile>
                    <AdminUserDetails />
                  </RequireProfile>
                </PortalGuard>
              }
            />
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
              path="/admin/duplicates"
              element={
                <PortalGuard allowedRoles={['admin']}>
                  <RequireProfile>
                    <DuplicateIssues />
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
      </Suspense>
      {!isAdminRoute && <Footer />}
      <Toaster />
    </>
  );
};

export default App;
