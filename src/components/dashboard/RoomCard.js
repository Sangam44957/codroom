import { useRouter } from "next/navigation";

export default function RoomCard({ room }) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(room.status === "completed" ? `/room/${room.id}/report` : `/room/${room.id}`)}
      className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-blue-600 cursor-pointer transition-all"
    >
      <h3 className="text-xl font-semibold text-white mb-2">{room.name}</h3>
      <p className="text-gray-400 text-sm mb-4">{room.description || "No description"}</p>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">Language: {room.language}</span>
        <span className="text-blue-500">Join →</span>
      </div>
    </div>
  );
}
