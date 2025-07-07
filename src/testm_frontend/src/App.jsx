import React, { useState, useEffect } from "react";
import { HttpAgent, Actor } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import { idlFactory as backendIDL, canisterId as backendId } from "../../declarations/testm_backend";
import { motion } from "framer-motion";
import { Toaster, toast } from "react-hot-toast";
import "./index.scss";

const App = () => {
  const [authClient, setAuthClient] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [actor, setActor] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const [profileName, setProfileName] = useState("");
  const [profileRoll, setProfileRoll] = useState("");

  const [courses, setCourses] = useState([]);
  const [voteRequests, setVoteRequests] = useState([]);

  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseDescription, setNewCourseDescription] = useState("");
  const [proposedCourseId, setProposedCourseId] = useState("");

  useEffect(() => {
    const initAuth = async () => {
      const client = await AuthClient.create();
      setAuthClient(client);

      if (client.isAuthenticated()) {
        const id = client.getIdentity();
        setIdentity(id);
        await initActor(id);
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const initActor = async (id) => {
    const agent = new HttpAgent({ identity: id });

    if (window.location.hostname === "localhost") {
      try {
        await agent.fetchRootKey();
        console.info("✅ Fetched root key (local dev)");
      } catch (err) {
        console.error("⚠️ Failed to fetch root key. Is replica running?");
        toast.error("⚠️ Local replica not running?");
      }
    }

    const actorInstance = Actor.createActor(backendIDL, {
      agent,
      canisterId: backendId,
    });
    setActor(actorInstance);

    try {
      await fetchInitialData(actorInstance);
    } catch (err) {
      console.error(err);
      toast.error("⚠️ Could not fetch backend data.");
    }
  };

  const fetchInitialData = async (actorInstance) => {
    const courses = await actorInstance.get_courses();
    const votes = await actorInstance.get_vote_requests();
    setCourses(courses);
    setVoteRequests(votes);
  };

  const login = async (selectedRole) => {
    setRole(selectedRole);
    await authClient.login({
      identityProvider: `https://identity.ic0.app`,
      onSuccess: async () => {
        const id = authClient.getIdentity();
        setIdentity(id);
        await initActor(id);
      },
    });
  };

  const logout = async () => {
    await authClient.logout();
    setIdentity(null);
    setActor(null);
    setRole(null);
    setCourses([]);
    setVoteRequests([]);
    toast.success("✅ Logged out");
  };

  const saveProfile = () => {
    toast.success("✅ Profile saved (local only)");
  };

  const createCourse = async () => {
    if (!newCourseTitle || !newCourseDescription) {
      toast.error("Please fill in all fields");
      return;
    }
    await actor.create_course(newCourseTitle, newCourseDescription);
    toast.success("✅ Course created");
    setNewCourseTitle("");
    setNewCourseDescription("");
    fetchInitialData(actor);
  };

  const createVoteRequest = async () => {
    if (!proposedCourseId) {
      toast.error("Enter course ID");
      return;
    }
    await actor.create_vote_request(Number(proposedCourseId));
    toast.success("✅ Vote request created");
    setProposedCourseId("");
    fetchInitialData(actor);
  };

  const voteOnCourse = async (voteId) => {
    await actor.vote_up(voteId);
    toast.success("✅ Voted 👍");
    fetchInitialData(actor);
  };

  const declineVoteRequest = async (voteId) => {
    await actor.vote_down(voteId);
    toast.success("✅ Voted 👎");
    fetchInitialData(actor);
  };

  const Panel = ({ children }) => (
    <motion.div
      className="panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );

  if (loading) {
    return (
      <div className="app">
        <Toaster position="top-right" />
        <h2>Loading…</h2>
      </div>
    );
  }

  return (
    <div className="app">
      <Toaster position="top-right" />
      <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        EduChain DAO
      </motion.h1>

      {!identity ? (
        <>
          <h2>Select Role to Login</h2>
          <motion.button onClick={() => login("student")} className="login-btn">
            Login as Student
          </motion.button>
          <motion.button onClick={() => login("admin")} className="login-btn">
            Login as Admin
          </motion.button>
        </>
      ) : (
        <>
          <motion.button onClick={logout} className="logout-btn">
            Logout
          </motion.button>

          {role === "student" && (
            <>
              <Panel>
                <h2>Profile</h2>
                <input type="text" placeholder="Name" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                <input type="text" placeholder="Roll No." value={profileRoll} onChange={(e) => setProfileRoll(e.target.value)} />
                <button onClick={saveProfile}>Save Profile</button>
              </Panel>

              <Panel>
                <h2>Student Dashboard</h2>

                <h3>Available Courses</h3>
                <ul>
                  {courses.map((c) => (
                    <li key={c.id}><strong>{c.title}</strong> — {c.description}</li>
                  ))}
                </ul>

                <h3>Propose a Vote</h3>
                <input type="text" placeholder="Enter Course ID" value={proposedCourseId} onChange={(e) => setProposedCourseId(e.target.value)} />
                <button onClick={createVoteRequest}>Propose Vote</button>

                <h3>Active Votes</h3>
                <ul>
                  {voteRequests.map((v) => (
                    <li key={v.id}>
                      Course ID: {v.course_id} — 👍 {v.upvotes} 👎 {v.downvotes}
                      <button onClick={() => voteOnCourse(v.id)}>👍</button>
                      <button onClick={() => declineVoteRequest(v.id)}>👎</button>
                    </li>
                  ))}
                </ul>
              </Panel>
            </>
          )}

          {role === "admin" && (
            <Panel>
              <h2>Admin Dashboard</h2>

              <h3>Create New Course</h3>
              <input type="text" placeholder="Title" value={newCourseTitle} onChange={(e) => setNewCourseTitle(e.target.value)} />
              <input type="text" placeholder="Description" value={newCourseDescription} onChange={(e) => setNewCourseDescription(e.target.value)} />
              <button onClick={createCourse}>Create Course</button>

              <h3>Existing Courses</h3>
              <ul>
                {courses.map((c) => (
                  <li key={c.id}><strong>{c.title}</strong> — {c.description}</li>
                ))}
              </ul>
            </Panel>
          )}
        </>
      )}
    </div>
  );
};

export default App;
