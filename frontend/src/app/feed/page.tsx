import { LiveNewsFeed } from "@/components/feed/LiveNewsFeed"
import { FetchNewsButton } from "@/components/feed/FetchNewsButton"

export default function FeedPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Intelligence Feed</h1>
        <p className="text-slate-400 mt-1">Real-time stream of analyzed geopolitical articles</p>
      </div>
      <FetchNewsButton />
      <LiveNewsFeed />
    </div>
  )
}
