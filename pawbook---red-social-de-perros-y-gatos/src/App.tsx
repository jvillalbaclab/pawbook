import React, { useState, useEffect } from "react";
import {
  PetProfile,
  Post,
  ReactionType,
  MarketplaceItem,
  DailyChallenge,
  Achievement,
  UserGamificationState,
  DonationCampaign,
  UserDonationHistoryItem,
  VetProfessional,
  VetAppointment,
  FrequentPetSound,
} from "./types";
import {
  INITIAL_USER_PETS,
  INITIAL_POSTS,
  PLAYDATE_CANDIDATES,
  ADOPTION_PETS,
  INITIAL_MARKETPLACE_ITEMS,
  INITIAL_DAILY_CHALLENGES,
  INITIAL_ACHIEVEMENTS,
  INITIAL_GAMIFICATION_STATE,
  INITIAL_DONATION_CAMPAIGNS,
  INITIAL_USER_DONATION_HISTORY,
  INITIAL_VETS,
  INITIAL_VET_APPOINTMENTS,
  INITIAL_FREQUENT_PET_SOUNDS,
} from "./data/mockData";
import { Navbar } from "./components/Navbar";
import { NavigationTabs, TabType, NAV_ITEMS } from "./components/NavigationTabs";
import { FeedView } from "./components/Feed/FeedView";
import { CreatePostModal } from "./components/Feed/CreatePostModal";
import { PawMatesView } from "./components/PawMates/PawMatesView";
import { AIPetHub } from "./components/AITools/AIPetHub";
import { AdoptionView } from "./components/Adoption/AdoptionView";
import { MarketplaceView } from "./components/Marketplace/MarketplaceView";
import { PetSoundboard } from "./components/Soundboard/PetSoundboard";
import { PetProfileView } from "./components/Profile/PetProfileView";
import { ChallengesView } from "./components/Challenges/ChallengesView";
import { DonationsView } from "./components/Donations/DonationsView";
import { VetsView } from "./components/Vets/VetsView";
import { Plus, Flame, Trophy, MapPin, ChevronRight, PawPrint, ShieldCheck } from "lucide-react";

export default function App() {
  // Persistence state initialized from localStorage if available
  const [pets, setPets] = useState<PetProfile[]>(() => {
    const saved = localStorage.getItem("pawbook_pets");
    return saved ? JSON.parse(saved) : INITIAL_USER_PETS;
  });

  const [activePet, setActivePet] = useState<PetProfile>(() => {
    return pets[0] || INITIAL_USER_PETS[0];
  });

  const [posts, setPosts] = useState<Post[]>(() => {
    const saved = localStorage.getItem("pawbook_posts");
    return saved ? JSON.parse(saved) : INITIAL_POSTS;
  });

  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>(() => {
    const saved = localStorage.getItem("pawbook_marketplace");
    return saved ? JSON.parse(saved) : INITIAL_MARKETPLACE_ITEMS;
  });

  const [donationCampaigns, setDonationCampaigns] = useState<DonationCampaign[]>(() => {
    const saved = localStorage.getItem("pawbook_donations_v2");
    return saved ? JSON.parse(saved) : INITIAL_DONATION_CAMPAIGNS;
  });

  const [donationHistory, setDonationHistory] = useState<UserDonationHistoryItem[]>(() => {
    const saved = localStorage.getItem("pawbook_donation_history");
    return saved ? JSON.parse(saved) : INITIAL_USER_DONATION_HISTORY;
  });

  const [vets, setVets] = useState<VetProfessional[]>(() => {
    const saved = localStorage.getItem("pawbook_vets");
    return saved ? JSON.parse(saved) : INITIAL_VETS;
  });

  const [vetAppointments, setVetAppointments] = useState<VetAppointment[]>(() => {
    const saved = localStorage.getItem("pawbook_vet_appointments");
    return saved ? JSON.parse(saved) : INITIAL_VET_APPOINTMENTS;
  });

  const [frequentPetSounds, setFrequentPetSounds] = useState<FrequentPetSound[]>(() => {
    const saved = localStorage.getItem("pawbook_frequent_sounds");
    return saved ? JSON.parse(saved) : INITIAL_FREQUENT_PET_SOUNDS;
  });

  // Gamification state
  const [challenges, setChallenges] = useState<DailyChallenge[]>(() => {
    const saved = localStorage.getItem("pawbook_challenges");
    return saved ? JSON.parse(saved) : INITIAL_DAILY_CHALLENGES;
  });

  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    const saved = localStorage.getItem("pawbook_achievements");
    return saved ? JSON.parse(saved) : INITIAL_ACHIEVEMENTS;
  });

  const [gamificationState, setGamificationState] = useState<UserGamificationState>(() => {
    const saved = localStorage.getItem("pawbook_gamification");
    return saved ? JSON.parse(saved) : INITIAL_GAMIFICATION_STATE;
  });

  const [hasClaimedCheckinToday, setHasClaimedCheckinToday] = useState<boolean>(() => {
    const savedDate = localStorage.getItem("pawbook_checkin_date");
    const today = new Date().toISOString().split("T")[0];
    return savedDate === today;
  });

  const [activeTab, setActiveTab] = useState<TabType>("feed");
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [initialChatCandidateId, setInitialChatCandidateId] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("pawbook_pets", JSON.stringify(pets));
  }, [pets]);

  useEffect(() => {
    localStorage.setItem("pawbook_posts", JSON.stringify(posts));
  }, [posts]);

  useEffect(() => {
    localStorage.setItem("pawbook_marketplace", JSON.stringify(marketplaceItems));
  }, [marketplaceItems]);

  useEffect(() => {
    localStorage.setItem("pawbook_donations_v2", JSON.stringify(donationCampaigns));
  }, [donationCampaigns]);

  useEffect(() => {
    localStorage.setItem("pawbook_donation_history", JSON.stringify(donationHistory));
  }, [donationHistory]);

  useEffect(() => {
    localStorage.setItem("pawbook_vets", JSON.stringify(vets));
  }, [vets]);

  useEffect(() => {
    localStorage.setItem("pawbook_vet_appointments", JSON.stringify(vetAppointments));
  }, [vetAppointments]);

  useEffect(() => {
    localStorage.setItem("pawbook_frequent_sounds", JSON.stringify(frequentPetSounds));
  }, [frequentPetSounds]);

  useEffect(() => {
    localStorage.setItem("pawbook_challenges", JSON.stringify(challenges));
  }, [challenges]);

  useEffect(() => {
    localStorage.setItem("pawbook_achievements", JSON.stringify(achievements));
  }, [achievements]);

  useEffect(() => {
    localStorage.setItem("pawbook_gamification", JSON.stringify(gamificationState));
  }, [gamificationState]);

  // Automatic challenge progress tracking helper
  const incrementChallengeProgress = (challengeId: string, amount: number = 1) => {
    setChallenges((prev) =>
      prev.map((c) => {
        if (c.id !== challengeId || c.isCompleted) return c;
        const newCount = Math.min(c.targetCount, c.currentCount + amount);
        return { ...c, currentCount: newCount };
      })
    );
  };

  // Gamification Handlers
  const handleClaimChallenge = (challengeId: string) => {
    const challenge = challenges.find((c) => c.id === challengeId);
    if (!challenge || challenge.isCompleted) return;

    setChallenges((prev) =>
      prev.map((c) => (c.id === challengeId ? { ...c, isCompleted: true } : c))
    );

    const newPoints = gamificationState.pawPoints + challenge.points;
    const newCompletedCount = gamificationState.completedChallengesCount + 1;
    const newLevel = Math.floor(newPoints / 150) + 1;

    let levelTitle = "Cachorro Explorador 🐕";
    if (newLevel >= 5) levelTitle = "Leyenda de PawBook 👑";
    else if (newLevel >= 4) levelTitle = "Líder de la Manada 🏆";
    else if (newLevel >= 3) levelTitle = "Guardián de Barrio 🛡️";

    setGamificationState((prev) => ({
      ...prev,
      pawPoints: newPoints,
      completedChallengesCount: newCompletedCount,
      level: newLevel,
      levelTitle,
    }));

    if (newCompletedCount >= 10) {
      setAchievements((prev) =>
        prev.map((a) => (a.id === "ach-6" ? { ...a, unlocked: true, unlockedAt: "Hoy" } : a))
      );
    }
  };

  const handleClaimDailyCheckin = () => {
    if (hasClaimedCheckinToday) return;
    const today = new Date().toISOString().split("T")[0];
    localStorage.setItem("pawbook_checkin_date", today);
    setHasClaimedCheckinToday(true);

    setGamificationState((prev) => ({
      ...prev,
      pawPoints: prev.pawPoints + 25,
      streakDays: prev.streakDays + 1,
    }));
  };

  const handleUnlockBadgeWithPoints = (badgeName: string, cost: number) => {
    if (gamificationState.pawPoints < cost) return;

    setGamificationState((prev) => ({
      ...prev,
      pawPoints: prev.pawPoints - cost,
    }));

    if (!activePet.badges.includes(badgeName)) {
      const updatedPet = {
        ...activePet,
        badges: [...activePet.badges, badgeName],
      };
      handleUpdatePet(updatedPet);
    }
  };

  const handleSelectPet = (pet: PetProfile) => {
    setActivePet(pet);
  };

  const handleAddPet = (newPetData: Omit<PetProfile, "id">) => {
    const newPet: PetProfile = {
      ...newPetData,
      id: `pet-${Date.now()}`,
    };
    const updatedPets = [...pets, newPet];
    setPets(updatedPets);
    setActivePet(newPet);
  };

  const handleUpdatePet = (updatedPet: PetProfile) => {
    const updatedPets = pets.map((p) => (p.id === updatedPet.id ? updatedPet : p));
    setPets(updatedPets);
    setActivePet(updatedPet);
  };

  const handleReact = (postId: string, reaction: ReactionType) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id !== postId) return post;

        const currentReaction = post.userReaction;
        const newReactions = { ...post.reactions };

        if (currentReaction === reaction) {
          newReactions[reaction] = Math.max(0, newReactions[reaction] - 1);
          return { ...post, reactions: newReactions, userReaction: undefined };
        } else {
          if (currentReaction) {
            newReactions[currentReaction] = Math.max(0, newReactions[currentReaction] - 1);
          }
          newReactions[reaction] = (newReactions[reaction] || 0) + 1;
          incrementChallengeProgress("challenge-2", 1);
          return { ...post, reactions: newReactions, userReaction: reaction };
        }
      })
    );
  };

  const handleAddComment = (postId: string, commentText: string) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id !== postId) return post;

        const newComment = {
          id: `comment-${Date.now()}`,
          petName: activePet.name,
          petAvatar: activePet.avatar,
          species: activePet.species,
          content: commentText,
          timestamp: "Justo ahora",
          likes: 0,
        };

        return {
          ...post,
          comments: [...post.comments, newComment],
        };
      })
    );
  };

  const handleSavePost = (postId: string) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id !== postId) return post;
        return { ...post, isSaved: !post.isSaved };
      })
    );
  };

  const handleCreatePost = (newPostData: Omit<Post, "id" | "timestamp" | "reactions" | "comments">) => {
    const newPost: Post = {
      ...newPostData,
      id: `post-${Date.now()}`,
      timestamp: "Hace un instante",
      reactions: { paws: 1, bones: 0, fish: 0, hearts: 1 },
      comments: [],
    };

    setPosts([newPost, ...posts]);
    incrementChallengeProgress("challenge-1", 1);
  };

  // Marketplace Handlers
  const handleAddMarketplaceItem = (
    newItemData: Omit<MarketplaceItem, "id" | "createdAt" | "likesCount">
  ) => {
    const newItem: MarketplaceItem = {
      ...newItemData,
      id: `item-${Date.now()}`,
      likesCount: 1,
      createdAt: "Justo ahora",
    };
    setMarketplaceItems([newItem, ...marketplaceItems]);

    setAchievements((prev) =>
      prev.map((a) => (a.id === "ach-4" ? { ...a, unlocked: true, unlockedAt: "Hoy" } : a))
    );
  };

  const handleToggleMarketplaceLike = (itemId: string) => {
    setMarketplaceItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const isLiked = !item.isLiked;
        return {
          ...item,
          isLiked,
          likesCount: isLiked ? item.likesCount + 1 : Math.max(0, item.likesCount - 1),
        };
      })
    );
  };

  const handleMarkMarketplaceSold = (itemId: string) => {
    setMarketplaceItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        return { ...item, isSold: !item.isSold };
      })
    );
  };

  const handleDeleteMarketplaceItem = (itemId: string) => {
    setMarketplaceItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handlePlaySound = () => {
    incrementChallengeProgress("challenge-3", 1);
  };

  const handleUseAITool = () => {
    incrementChallengeProgress("challenge-4", 1);
    setAchievements((prev) =>
      prev.map((a) => (a.id === "ach-3" ? { ...a, unlocked: true, unlockedAt: "Hoy" } : a))
    );
  };

  const handleInteractPawMates = () => {
    incrementChallengeProgress("challenge-5", 1);
  };

  const activePetPosts = posts.filter(
    (p) => p.petId === activePet.id || p.petName.toLowerCase() === activePet.name.toLowerCase()
  );

  const unclaimedChallengesCount = challenges.filter(
    (c) => c.currentCount >= c.targetCount && !c.isCompleted
  ).length;

  const completedChallengesCount = challenges.filter((c) => c.isCompleted).length;

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-stone-900 font-sans flex flex-col">
      {/* Top Navbar */}
      <Navbar
        pets={pets}
        activePet={activePet}
        onSelectPet={handleSelectPet}
        onOpenCreatePost={() => setIsCreatePostOpen(true)}
        onOpenAddPet={() => setActiveTab("profile")}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        streakDays={gamificationState.streakDays}
        pawPoints={gamificationState.pawPoints}
        onOpenChallenges={() => setActiveTab("challenges")}
      />

      {/* Mobile & Tablet Navigation Bars */}
      <NavigationTabs
        activeTab={activeTab}
        onChangeTab={(t) => {
          setActiveTab(t);
          if (t === "pawmates") handleInteractPawMates();
        }}
        unclaimedChallengesCount={unclaimedChallengesCount}
        onOpenCreatePost={() => setIsCreatePostOpen(true)}
      />

      {/* Desktop 3-Column Social Layout (Instagram / TikTok Web Architecture) */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-0 sm:px-4 lg:px-6 flex gap-8 items-start">
        {/* Left Sidebar Navigation (Desktop lg+) */}
        <aside className="hidden lg:flex flex-col w-60 shrink-0 sticky top-20 py-4 space-y-6">
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const hasAlert = item.id === "challenges" && unclaimedChallengesCount > 0;

              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (item.id === "pawmates") handleInteractPawMates();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm transition-all cursor-pointer group ${
                    isActive
                      ? "bg-stone-900 text-white font-bold shadow-xs"
                      : "text-stone-600 hover:bg-[#F3F1EC] hover:text-stone-900 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-105 ${
                        isActive ? "text-[#FF5A36]" : "text-stone-500 group-hover:text-stone-900"
                      }`}
                    />
                    <span className="truncate whitespace-nowrap">{item.label}</span>
                  </div>

                  {hasAlert && (
                    <span className="text-[11px] font-bold text-[#FF5A36] tabular-nums">
                      +{unclaimedChallengesCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Primary Create Post CTA */}
          <button
            type="button"
            onClick={() => setIsCreatePostOpen(true)}
            className="w-full py-3 px-4 rounded-2xl bg-[#FF5A36] hover:bg-[#E04826] text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nueva publicación</span>
          </button>

          {/* Subtle Animal Identity Card */}
          <div className="p-4 rounded-3xl bg-[#F3F1EC]/80 border border-stone-200/60 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-700">
              <PawPrint className="w-4 h-4 text-[#FF5A36]" />
              <span>Comunidad Animal</span>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Espacio diseñado para perros y gatos. Comparte momentos, explora el radar de paseos y apoya la adopción responsable.
            </p>
          </div>
        </aside>

        {/* Center Main Content Area */}
        <main className="flex-1 min-w-0 pb-24 lg:pb-12">
          {activeTab === "feed" && (
            <FeedView
              posts={posts}
              activePet={activePet}
              onReact={handleReact}
              onAddComment={handleAddComment}
              onSavePost={handleSavePost}
              onOpenCreatePost={() => setIsCreatePostOpen(true)}
              searchQuery={searchQuery}
              onNavigateTab={(t) => {
                setActiveTab(t);
                if (t === "pawmates") handleInteractPawMates();
              }}
            />
          )}

          {activeTab === "challenges" && (
            <ChallengesView
              challenges={challenges}
              achievements={achievements}
              gamificationState={gamificationState}
              activePet={activePet}
              onClaimChallenge={handleClaimChallenge}
              onNavigateTab={(t) => setActiveTab(t as TabType)}
              onClaimDailyCheckin={handleClaimDailyCheckin}
              hasClaimedToday={hasClaimedCheckinToday}
              onUnlockBadgeWithPoints={handleUnlockBadgeWithPoints}
            />
          )}

          {activeTab === "pawmates" && (
            <PawMatesView
              candidates={PLAYDATE_CANDIDATES}
              activePet={activePet}
              initialChatCandidateId={initialChatCandidateId}
              onClearInitialChat={() => setInitialChatCandidateId(null)}
            />
          )}

          {activeTab === "vets" && (
            <VetsView
              vets={vets}
              appointments={vetAppointments}
              activePet={activePet}
              onBookAppointment={(newApt) => {
                const created: VetAppointment = {
                  ...newApt,
                  id: `apt-${Date.now()}`,
                };
                setVetAppointments((prev) => [created, ...prev]);
              }}
              onRegisterVet={(newVet) => {
                setVets((prev) => [newVet, ...prev]);
              }}
            />
          )}

          {activeTab === "ai" && (
            <AIPetHub
              activePet={activePet}
              frequentSounds={frequentPetSounds}
              onSaveFrequentSound={(newSound) => {
                setFrequentPetSounds((prev) => [newSound, ...prev]);
              }}
              onCreatePost={(postData) => {
                handleCreatePost(postData);
                handleUseAITool();
              }}
            />
          )}

          {activeTab === "market" && (
            <MarketplaceView
              items={marketplaceItems}
              activePet={activePet}
              onAddItem={handleAddMarketplaceItem}
              onToggleLike={handleToggleMarketplaceLike}
              onMarkSold={handleMarkMarketplaceSold}
              onDeleteItem={handleDeleteMarketplaceItem}
            />
          )}

          {activeTab === "adoption" && <AdoptionView pets={ADOPTION_PETS} />}

          {activeTab === "donations" && (
            <DonationsView
              campaigns={donationCampaigns}
              donationHistory={donationHistory}
              activePet={activePet}
              userPawPoints={gamificationState.pawPoints}
              onDonate={(
                campaignId,
                amount,
                donorName,
                message,
                paymentMethodLabel
              ) => {
                const targetCampaign = donationCampaigns.find(
                  (c) => c.id === campaignId
                );

                setDonationCampaigns((prev) =>
                  prev.map((c) => {
                    if (c.id !== campaignId) return c;
                    return {
                      ...c,
                      raisedAmount: c.raisedAmount + amount,
                      donorsCount: c.donorsCount + 1,
                      recentDonors: [
                        {
                          id: `dr-${Date.now()}`,
                          donorName,
                          petName: `${activePet.name} ${activePet.species === "dog" ? "🐕" : "🐈"}`,
                          amount,
                          message,
                          timestamp: "Ahora mismo",
                        },
                        ...c.recentDonors,
                      ],
                    };
                  })
                );

                if (targetCampaign) {
                  const newHistoryEntry: UserDonationHistoryItem = {
                    id: `hist-${Date.now()}`,
                    campaignId: targetCampaign.id,
                    animalName: targetCampaign.animalName,
                    species: targetCampaign.species,
                    animalImage: targetCampaign.imageUrl,
                    foundationName: targetCampaign.foundationName,
                    amount,
                    currency: targetCampaign.currency,
                    date: "Hoy, ahora mismo",
                    paymentMethod: paymentMethodLabel,
                    receiptCode: `REC-PAW-${Math.floor(1000 + Math.random() * 9000)}`,
                    message,
                  };
                  setDonationHistory((prev) => [newHistoryEntry, ...prev]);
                }

                // Reward +30 solidary PawPoints for helping a verified animal
                setGamificationState((prev) => {
                  const newPoints = prev.pawPoints + 30;
                  return {
                    ...prev,
                    pawPoints: newPoints,
                    level: Math.floor(newPoints / 150) + 1,
                  };
                });
              }}
              onCreateCampaign={(newCampaign) => {
                setDonationCampaigns((prev) => [newCampaign, ...prev]);
              }}
              onAddCampaignUpdate={(campaignId, update) => {
                setDonationCampaigns((prev) =>
                  prev.map((c) => {
                    if (c.id !== campaignId) return c;
                    return {
                      ...c,
                      currentStage: update.stage || c.currentStage,
                      updates: [update, ...(c.updates || [])],
                    };
                  })
                );
              }}
            />
          )}

          {activeTab === "soundboard" && (
            <div onClick={handlePlaySound}>
              <PetSoundboard />
            </div>
          )}

          {activeTab === "profile" && (
            <PetProfileView
              pet={activePet}
              allPets={pets}
              petPosts={activePetPosts}
              onUpdatePet={handleUpdatePet}
              onAddPet={handleAddPet}
              onSelectPet={handleSelectPet}
            />
          )}
        </main>

        {/* Right Contextual Sidebar (Visible on Desktop xl+ when browsing Feed) */}
        {activeTab === "feed" && (
          <aside className="hidden xl:flex flex-col w-80 shrink-0 sticky top-20 py-5 space-y-5">
            {/* Active Pet Profile Summary Card */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={activePet.avatar}
                      alt={activePet.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-[#FF5A36]/80"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 text-xs bg-white rounded-full px-0.5 shadow-2xs">
                      {activePet.species === "dog" ? "🐕" : "🐈"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-sm text-stone-900 truncate">
                      {activePet.name}
                    </h3>
                    <p className="text-xs text-stone-500 truncate">
                      {activePet.breed} · {activePet.age}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("profile")}
                  className="text-xs font-semibold text-[#FF5A36] hover:underline shrink-0 cursor-pointer"
                >
                  Ver perfil
                </button>
              </div>

              {/* Quick Switcher if user has multiple pets */}
              {pets.length > 1 && (
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-stone-400 font-medium">Tus mascotas:</span>
                  <div className="flex items-center gap-1.5">
                    {pets.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => handleSelectPet(p)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          p.id === activePet.id
                            ? "bg-stone-900 text-white"
                            : "bg-[#FAF9F6] text-stone-600 hover:bg-[#F3F1EC]"
                        }`}
                      >
                        <span>{p.species === "dog" ? "🐕" : "🐈"}</span>
                        <span>{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Daily Challenges & Streak Minimalist Card */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#FF5A36] fill-[#FF5A36]" />
                  <h4 className="font-display font-bold text-xs text-stone-900">
                    Retos de Hoy
                  </h4>
                </div>
                <span className="text-xs text-stone-500 font-medium tabular-nums">
                  {completedChallengesCount}/{challenges.length}
                </span>
              </div>

              <div className="w-full bg-[#F3F1EC] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#FF5A36] h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round((completedChallengesCount / (challenges.length || 1)) * 100)}%`,
                  }}
                />
              </div>

              <p className="text-xs text-stone-500 leading-relaxed">
                Nivel {gamificationState.level} · {gamificationState.levelTitle}
              </p>

              <button
                type="button"
                onClick={() => setActiveTab("challenges")}
                className="w-full py-2 px-3 bg-[#FAF9F6] hover:bg-[#F3F1EC] text-stone-800 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>Ver misiones y recompensas</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
              </button>
            </div>

            {/* Verified Donations Highlight Card in Right Sidebar */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                  <ShieldCheck className="w-4 h-4 stroke-[2.4]" />
                  <span>Donaciones Verificadas</span>
                </span>
                <span className="text-[11px] text-stone-400 font-medium">
                  Filtro 100% Real
                </span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Auditamos por videollamada y clínica veterinaria que cada animalito exista antes de abrir donaciones.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("donations")}
                className="w-full py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Ver animalitos ayudados</span>
                <ChevronRight className="w-3.5 h-3.5 text-emerald-200" />
              </button>
            </div>

            {/* Suggested PawMates Nearby */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-display font-bold text-xs text-stone-900">
                  Amigos de paseo cerca
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("pawmates");
                    handleInteractPawMates();
                  }}
                  className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                >
                  Abrir radar
                </button>
              </div>

              <div className="space-y-3">
                {PLAYDATE_CANDIDATES.slice(0, 3).map((cand) => (
                  <div key={cand.id} className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={cand.avatar}
                        alt={cand.name}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 text-xs font-bold text-stone-900 truncate">
                          <span>{cand.name}</span>
                          <span>{cand.species === "dog" ? "🐕" : "🐈"}</span>
                        </div>
                        <p className="text-[11px] text-stone-400 truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{cand.distance}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setInitialChatCandidateId(cand.id);
                        setActiveTab("pawmates");
                        handleInteractPawMates();
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-[#FAF9F6] hover:bg-emerald-50 text-stone-700 hover:text-emerald-700 text-xs font-semibold transition-colors cursor-pointer shrink-0"
                    >
                      Chatear 💬
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Minimalist Footer Info */}
            <div className="px-2 text-[11px] text-stone-400 space-y-1">
              <p>© 2026 PawBook · Red Social para Perros y Gatos</p>
              <p>Diseñado con amor para el bienestar animal 🐾</p>
            </div>
          </aside>
        )}
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        pets={pets}
        activePet={activePet}
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onCreatePost={handleCreatePost}
      />
    </div>
  );
}
