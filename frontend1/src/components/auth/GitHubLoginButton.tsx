// File path: frontend1/src/components/auth/GitHubLoginButton.tsx

import React from 'react';
import { Button } from "@/components/ui/button";
import GitHubLogo from "@/components/icons/GitHubLogo";
import frontendLogger from '@/config/frontendLogger';

const GitHubLoginButton: React.FC = () => {
  const handleGitHubLogin = (e: React.MouseEvent) => {
    e.preventDefault();

    try {
      // API URL from environment or fallback
      const githubAuthUrl = `http://localhost:5001/api/auth/github`;

      // Store current path for post-auth redirect
      localStorage.setItem('preAuthPath', window.location.pathname);

      frontendLogger.info('Initiating GitHub login', {
        from: window.location.pathname
      });

      window.location.href = githubAuthUrl;
    } catch (error) {
      frontendLogger.error('Failed to initiate GitHub login:', error);
    }
  };

  return (
    <Button
      onClick={handleGitHubLogin}
      variant="default"
      className="bg-black text-white hover:bg-black focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <GitHubLogo className="mr-2" />
      Login with GitHub
    </Button>
  );
};

export default GitHubLoginButton;
