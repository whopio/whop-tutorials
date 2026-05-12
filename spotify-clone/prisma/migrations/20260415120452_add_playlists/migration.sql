-- CreateTable
CREATE TABLE "UserPlaylist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPlaylist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPlaylistSong" (
    "id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPlaylistSong_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPlaylistSong_playlistId_songId_key" ON "UserPlaylistSong"("playlistId", "songId");

-- AddForeignKey
ALTER TABLE "UserPlaylist" ADD CONSTRAINT "UserPlaylist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPlaylistSong" ADD CONSTRAINT "UserPlaylistSong_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "UserPlaylist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPlaylistSong" ADD CONSTRAINT "UserPlaylistSong_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;
