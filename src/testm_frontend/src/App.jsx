import React, { useState, useEffect } from "react";
import { AuthClient } from "@dfinity/auth-client";
import { HttpAgent, Actor } from "@dfinity/agent";
import { idlFactory as backendIDL, canisterId as backendId } from "../../declarations/testm_backend";
import { Toaster, toast } from "react-hot-toast";
import "./index.scss";

const App = () => {
  const [authClient, setAuthClient] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [actor, setActor] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const [courses, setCourses] = useState([]);
  const [voteRequests, setVoteRequests] = useState([]);

  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseDescription, setNewCourseDescription] = useState("");
  const [proposedCourseId, setProposedCourseId] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        const client = await AuthClient.create();
        setAuthClient(client);

        if (await client.isAuthenticated()) {
          const id = client.getIdentity();
          setIdentity(id);
          await initActor(id);
        }
      } catch (err) {
        console.error("Auth init error:", err);
        toast.error("⚠️ Failed to init AuthClient");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const initActor = async (id) => {
    try {
      const agent = new HttpAgent({ identity: id });

      // ✅ Must fetch root key in local dev to trust certificates
      if (process.env.DFX_NETWORK === "local" || window.location.hostname === "localhost") {
        await agent.fetchRootKey();
        console.log("Fetched root key for local dev ✅");
      }

      const act = Actor.createActor(backendIDL, { agent, canisterId: backendId });
      setActor(act);
      await fetchData(act);
    } catch (err) {
      console.error("Actor init failed:", err);
      toast.error("⚠️ Backend connection failed");
    }
  };

  const fetchData = async (act) => {
    try {
      const c = await act.get_courses();
      const v = await act.get_vote_requests();
      setCourses(c);
      setVoteRequests(v);
    } catch (err) {
      console.error("Fetch failed:", err);
      toast.error("⚠️ Could not fetch data");
    }
  };

  const login = async (selectedRole) => {
    try {
      setRole(selectedRole);
      await authClient.login({
        identityProvider: "https://identity.ic0.app",
        onSuccess: async () => {
          const id = await authClient.getIdentity();
          setIdentity(id);
          await initActor(id);
        }
      });
    } catch (err) {
      console.error("Login failed:", err);
      toast.error("⚠️ Login failed");
    }
  };

  const logout = async () => {
    try {
      await authClient.logout();
      setIdentity(null);
      setActor(null);
      setCourses([]);
      setVoteRequests([]);
      setRole(null);
      toast.success("✅ Logged out");
    } catch (err) {
      console.error("Logout failed:", err);
      toast.error("⚠️ Logout failed");
    }
  };

  if (loading) return <div className="app"><Toaster /><h2>Loading...</h2></div>;

  return (
    <div className="app">
      <Toaster />
      <h1>EduChain DAO</h1>

      {!identity ? (
        <>
          <h2>Login</h2>
          <button onClick={() => login("student")}>Login as Student</button>
          <button onClick={() => login("admin")}>Login as Admin</button>
        </>
      ) : (
        <>
          <button onClick={logout}>Logout</button>

          {role === "admin" && (
            <>
              <h3>Create Course</h3>
              <input value={newCourseTitle} onChange={(e) => setNewCourseTitle(e.target.value)} placeholder="Title" />
              <input value={newCourseDescription} onChange={(e) => setNewCourseDescription(e.target.value)} placeholder="Description" />
              <button onClick={async () => {
                try {
                  await actor.create_course(newCourseTitle, newCourseDescription);
                  toast.success("✅ Course created");
                  setNewCourseTitle("");
                  setNewCourseDescription("");
                  fetchData(actor);
                } catch (err) {
                  console.error("Create course failed:", err);
                  toast.error("⚠️ Failed to create course");
                }
              }}>Create</button>

              <h3>Courses</h3>
              <ul>{courses.map(c => <li key={c.id}>{c.title}: {c.description}</li>)}</ul>
            </>
          )}

          {role === "student" && (
            <>
              <h3>Courses</h3>
              <ul>{courses.map(c => <li key={c.id}>{c.title}: {c.description}</li>)}</ul>

              <h3>Propose Vote</h3>
              <input value={proposedCourseId} onChange={(e) => setProposedCourseId(e.target.value)} placeholder="Course ID" />
              <button onClick={async () => {
                try {
                  await actor.create_vote_request(Number(proposedCourseId));
                  toast.success("✅ Vote requested");
                  setProposedCourseId("");
                  fetchData(actor);
                } catch (err) {
                  console.error("Propose vote failed:", err);
                  toast.error("⚠️ Failed to propose vote");
                }
              }}>Propose</button>

              <h3>Active Votes</h3>
              <ul>{voteRequests.map(v =>
                <li key={v.id}>
                  Course {v.course_id}: 👍{v.upvotes} 👎{v.downvotes}
                  <button onClick={async () => {
                    try {
                      await actor.vote_up(v.id);
                      fetchData(actor);
                    } catch (err) {
                      console.error("Vote up failed:", err);
                      toast.error("⚠️ Failed to vote");
                    }
                  }}>👍</button>
                  <button onClick={async () => {
                    try {
                      await actor.vote_down(v.id);
                      fetchData(actor);
                    } catch (err) {
                      console.error("Vote down failed:", err);
                      toast.error("⚠️ Failed to vote");
                    }
                  }}>👎</button>
                </li>)}</ul>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default App;
