
import { useProfileContext } from '../context/ProfileContext';

// This hook now just proxies the global context.
// This allows us to switch to Context without breaking imports in 10+ files.
const useProfileStatus = () => {
  return useProfileContext();
};

export default useProfileStatus;
