"use client";

import React, { useEffect, useState } from "react";
import ScreenTimeGraph from "@/components/AreaChartComponent";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useRouter } from "next/navigation";
import { useLogin } from "@/context/LoginContext";

interface Entry {
  category: string;
  timeSpent: number; // In hours
}

const Track = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [limitUsage, setLimitUsage] = useState(7); // Default screen time limit in hours
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshGraph, setRefreshGraph] = useState(false);
  const { isLoggedIn } = useLogin();
  const router = useRouter();
  const [newEntry, setNewEntry] = useState({
    category: "",
    timeSpent: "",
  });


  useEffect(() => {
    getWeeklyData();
    getLimit();
  }, [refreshGraph]);

  const updateLimit = async () => {
    try {
      setSaving(true);
      const response = await fetch(
        "https://digital-detox-y73b.onrender.com/tracker/limit",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ limitedUsage: limitUsage }),
        }
      );

      if (response.ok) {
        toast.success("Screen time limit updated!");
      } else {
        toast.error("Failed to update limit.");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred while updating the limit.");
    } finally {
      setSaving(false);
    }
  };

  const getLimit = async () => {
    try {
      if (!isLoggedIn) {
        router.push("/login");
      }

      const response = await fetch(
        "https://digital-detox-y73b.onrender.com/tracker/limit",
        {
          method: "GET",
          credentials: "include",
        }
      );
      const result = await response.json();
      if (response.ok) {
        setLimitUsage(result.limitedUsage);
      } else {
        console.log("Error fetching the limit");
      }
    } catch (error) {
      router.push("/login");
      console.error("Error fetching limit:", error);
    }
  };

  const getWeeklyData = async () => {
    try {
      const response = await fetch(
        "https://digital-detox-y73b.onrender.com/tracker",
        {
          method: "GET",
          credentials: "include",
        }
      );
      const result = await response.json();
      setEntries(result.entries || []);
    } catch (error) {
      console.error("Error fetching weekly data:", error);
    }
  };

  const handleAddEntry = () => {
    const { category, timeSpent } = newEntry;
    const timeSpentNum = Number(timeSpent);

    // Validate time spent
    if (isNaN(timeSpentNum) || timeSpentNum <= 0) {
      toast.error("Please enter a valid time spent.");
      return;
    }

    // Check for duplicate categories
    if (entries.some((entry) => entry.category === category)) {
      toast.error(`The category "${category}" has already been added.`);
      return;
    }

    // Calculate the total time including the new entry
    const totalHours = entries.reduce((sum, entry) => sum + entry.timeSpent, 0) + timeSpentNum;
    if (totalHours > 24) {
      toast.error("Total time spent cannot exceed 24 hours.");
      return;
    }

    // Check category limit
    const categories = new Set(entries.map((entry) => entry.category));
    if (categories.size >= 4 && !categories.has(category)) {
      toast.error("You can only have a maximum of 4 categories.");
      return;
    }

    // Add the new entry
    setEntries((prevEntries) => [
      ...prevEntries,
      { category, timeSpent: timeSpentNum },
    ]);
    setNewEntry({ category: "", timeSpent: "" });
  };

  const handleRemoveEntry = (index: number) => {
    setEntries((prevEntries) => prevEntries.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (entries.length === 0) {
      toast.error("Please add at least one entry before submitting.");
      return;
    }
    const totalHours = entries.reduce((sum, entry) => sum + Number(entry.timeSpent), 0);
    if (totalHours > 24) {
      toast.error("Total time spent exceeds 24 hours.");
      return
    }

    const selectedDate = new Date(date);
    const today = new Date();
    if (selectedDate > today) {
      toast.error("Please select a valid past date.");
      return;
    }

    const dataToSend = {
      date: selectedDate.toISOString(),
      entries,
    };

    setLoading(true);
    try {
      const response = await fetch(
        "https://digital-detox-y73b.onrender.com/tracker",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(dataToSend),
        }
      );

      if (response.ok) {
        toast.success("Screen time data saved!");
        setEntries([]);
        setDate("");
        setRefreshGraph((prev) => !prev);
      } else {
        const result = await response.json();
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Error saving data:", error);
      toast.error("Error saving data.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleSaveClick = () => {
    setIsEditing(false);
    updateLimit();
  };

  return (
    <div className="my-20">
      {/* Form for screen time tracking */}
      <div className="max-w-md mt-28 mb-20 mx-auto p-6 bg-white shadow-md rounded-lg">
        {/* First Form: Add Entries */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddEntry();
          }}
          className="mb-8"
        >
          <h2 className="text-2xl font-semibold mb-4 text-center">Add Entry</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              value={newEntry.category}
              onChange={(e) =>
                setNewEntry({ ...newEntry, category: e.target.value })
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            >
              <option value="">Select Category</option>
              <option value="Social Media">Social Media</option>
              <option value="Productivity">Productivity</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Time Spent (hrs)
            </label>
            <input
              type="number"
              value={newEntry.timeSpent}
              onChange={(e) =>
                setNewEntry({ ...newEntry, timeSpent: e.target.value })
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add Entry
          </button>
        </form>

        {/* Display Added Entries */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-center">Entries</h2>
          {entries.length > 0 ? (
            entries.map((entry, index) => (
              <div
                key={index}
                className="flex justify-between items-center border p-2 mb-2 rounded"
              >
                <p>
                  {entry.category} - {entry.timeSpent.toFixed(2)} hrs
                </p>
                <button
                  onClick={() => handleRemoveEntry(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500">No entries added yet.</p>
          )}
        </div>

        {/* Second Form: Submit Entries */}
        <form onSubmit={handleSubmit}>
          <h2 className="text-2xl font-semibold mb-4 text-center">Submit Entries</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={loading}
          >
            {loading ? (<><FontAwesomeIcon icon={faSpinner} spin className="text-white" />  <span className="text-white">Submitting....</span></>) : "Submit"}
          </button>
        </form>
      </div>

      {/* Display Graph */}
      <div className="mt-10 mx-auto max-w-[1000px]">
        <p className="text-center font-semibold text-[30px] mb-8">
          Screen Time Usage
        </p>
        <ScreenTimeGraph refreshGraph={refreshGraph} limitedUsage={limitUsage} />
      </div>

      {/* Edit Screen Time Limit */}
      <div className="mb-4 mt-10 space-x-3 flex mx-auto justify-center flex-row items-center">
        <label className="block text-sm font-medium text-gray-700">
          Default Screen Time Limit (hrs):
        </label>
        <input
          type="number"
          value={limitUsage}
          onChange={(e) => setLimitUsage(Number(e.target.value))}
          disabled={!isEditing}
          className="mt-1 w-20 block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          min="1"
        />
      </div>

      <div className="flex space-x-3 mb-5 justify-center flex-row mt-3">
        <button
          className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          onClick={handleEditClick}
          disabled={isEditing}
        >
          Edit
        </button>
        <button
          className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          onClick={handleSaveClick}
          disabled={!isEditing}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
      <ToastContainer />
    </div>
  );
};

export default Track;

