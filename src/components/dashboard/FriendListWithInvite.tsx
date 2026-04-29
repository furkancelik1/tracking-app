"use client";

import React, { useState } from "react";
import { FriendList } from "./FriendList";
import { ChallengeInviteDialog } from "./ChallengeInviteDialog";
import type { FriendEntry, FriendRequest } from "@/actions/social.actions";

type Props = {
  friends: FriendEntry[];
  pendingRequests: FriendRequest[];
};

export default function FriendListWithInvite({ friends, pendingRequests }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string | undefined>(undefined);
  const [selectedFriendName, setSelectedFriendName] = useState<string | null | undefined>(undefined);

  const handleChallengeClick = (friendId: string, friendName: string | null) => {
    setSelectedFriendId(friendId);
    setSelectedFriendName(friendName);
    setOpen(true);
  };

  return (
    <>
      <FriendList
        friends={friends}
        pendingRequests={pendingRequests}
        onChallengeClick={handleChallengeClick}
      />

      <ChallengeInviteDialog
        friends={friends}
        preselectedFriendId={selectedFriendId}
        preselectedFriendName={selectedFriendName ?? null}
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setSelectedFriendId(undefined);
            setSelectedFriendName(undefined);
          }
        }}
      />
    </>
  );
}
