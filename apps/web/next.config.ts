import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // This repo manages its own agent docs (root CLAUDE.md + docs/agents/);
  // Next's generated AGENTS.md/CLAUDE.md would compete with them.
  agentRules: false,
};

export default nextConfig;
