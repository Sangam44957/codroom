const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const problems = [
  // ==================== EASY ====================
  {
    title: "Two Sum",
    description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

Example 1:
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].

Example 2:
Input: nums = [3,2,4], target = 6
Output: [1,2]

Example 3:
Input: nums = [3,3], target = 6
Output: [0,1]

Constraints:
- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9
- Only one valid answer exists.`,
    difficulty: "easy",
    topic: "arrays",
    starterCode: `function twoSum(nums, target) {\n  // Write your solution here\n  \n}`,
    testCases: [
      { input: { nums: [2, 7, 11, 15], target: 9 }, expected: [0, 1] },
      { input: { nums: [3, 2, 4], target: 6 }, expected: [1, 2] },
      { input: { nums: [3, 3], target: 6 }, expected: [0, 1] },
    ],
  },
  {
    title: "Reverse String",
    description: `Write a function that reverses a string. The input string is given as an array of characters.

You must do this by modifying the input array in-place.

Example 1:
Input: s = ["h","e","l","l","o"]
Output: ["o","l","l","e","h"]

Example 2:
Input: s = ["H","a","n","n","a","h"]
Output: ["h","a","n","n","a","H"]

Constraints:
- 1 <= s.length <= 10^5
- s[i] is a printable ASCII character.`,
    difficulty: "easy",
    topic: "strings",
    starterCode: `function reverseString(s) {\n  // Modify s in-place\n  \n}`,
    testCases: [
      { input: { s: ["h", "e", "l", "l", "o"] }, expected: ["o", "l", "l", "e", "h"] },
      { input: { s: ["H", "a", "n", "n", "a", "h"] }, expected: ["h", "a", "n", "n", "a", "H"] },
    ],
  },
  {
    title: "Valid Parentheses",
    description: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

Example 1:
Input: s = "()"
Output: true

Example 2:
Input: s = "()[]{}"
Output: true

Example 3:
Input: s = "(]"
Output: false

Constraints:
- 1 <= s.length <= 10^4
- s consists of parentheses only.`,
    difficulty: "easy",
    topic: "stacks",
    starterCode: `function isValid(s) {\n  // Write your solution here\n  \n}`,
    testCases: [
      { input: { s: "()" }, expected: true },
      { input: { s: "()[]{}" }, expected: true },
      { input: { s: "(]" }, expected: false },
      { input: { s: "([)]" }, expected: false },
    ],
  },
  {
    title: "Palindrome Number",
    description: `Given an integer x, return true if x is a palindrome, and false otherwise.

An integer is a palindrome when it reads the same forward and backward.

Example 1:
Input: x = 121
Output: true

Example 2:
Input: x = -121
Output: false
Explanation: From left to right, it reads -121. From right to left it becomes 121-. Therefore it is not a palindrome.

Example 3:
Input: x = 10
Output: false

Constraints:
- -2^31 <= x <= 2^31 - 1`,
    difficulty: "easy",
    topic: "math",
    starterCode: `function isPalindrome(x) {\n  // Write your solution here\n  \n}`,
    testCases: [
      { input: { x: 121 }, expected: true },
      { input: { x: -121 }, expected: false },
      { input: { x: 10 }, expected: false },
    ],
  },
  {
    title: "Maximum Subarray",
    description: `Given an integer array nums, find the subarray with the largest sum, and return its sum.

Example 1:
Input: nums = [-2,1,-3,4,-1,2,1,-5,4]
Output: 6
Explanation: The subarray [4,-1,2,1] has the largest sum 6.

Example 2:
Input: nums = [1]
Output: 1

Example 3:
Input: nums = [5,4,-1,7,8]
Output: 23

Constraints:
- 1 <= nums.length <= 10^5
- -10^4 <= nums[i] <= 10^4`,
    difficulty: "easy",
    topic: "arrays",
    starterCode: `function maxSubArray(nums) {\n  // Write your solution here\n  \n}`,
    testCases: [
      { input: { nums: [-2, 1, -3, 4, -1, 2, 1, -5, 4] }, expected: 6 },
      { input: { nums: [1] }, expected: 1 },
      { input: { nums: [5, 4, -1, 7, 8] }, expected: 23 },
    ],
  },
  {
    title: "Merge Two Sorted Lists",
    description: `You are given two sorted linked lists. Merge them into one sorted list.

The list should be made by splicing together the nodes of the first two lists.

Example 1:
Input: list1 = [1,2,4], list2 = [1,3,4]
Output: [1,1,2,3,4,4]

Example 2:
Input: list1 = [], list2 = []
Output: []

Example 3:
Input: list1 = [], list2 = [0]
Output: [0]

Constraints:
- The number of nodes in both lists is in the range [0, 50].
- -100 <= Node.val <= 100`,
    difficulty: "easy",
    topic: "linked-lists",
    starterCode: `function mergeTwoLists(list1, list2) {\n  // Write your solution here\n  \n}`,
    testCases: [
      { input: { list1: [1, 2, 4], list2: [1, 3, 4] }, expected: [1, 1, 2, 3, 4, 4] },
      { input: { list1: [], list2: [] }, expected: [] },
      { input: { list1: [], list2: [0] }, expected: [0] },
    ],
  },
  {
    title: "Best Time to Buy and Sell Stock",
    description: `You are given an array prices where prices[i] is the price of a given stock on the ith day.

You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.

Return the maximum profit you can achieve. If no profit possible, return 0.

Example 1:
Input: prices = [7,1,5,3,6,4]
Output: 5
Explanation: Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5.

Example 2:
Input: prices = [7,6,4,3,1]
Output: 0
Explanation: No profitable transaction possible.

Constraints:
- 1 <= prices.length <= 10^5
- 0 <= prices[i] <= 10^4`,
    difficulty: "easy",
    topic: "arrays",
    starterCode: `function maxProfit(prices) {\n  // Write your solution here\n  \n}`,
    testCases: [
      { input: { prices: [7, 1, 5, 3, 6, 4] }, expected: 5 },
      { input: { prices: [7, 6, 4, 3, 1] }, expected: 0 },
    ],
  },

  // ==================== MEDIUM ====================
  {
    title: "Longest Substring Without Repeating Characters",
    description: `Given a string s, find the length of the longest substring without repeating characters.

Example 1:
Input: s = "abcabcbb"
Output: 3
Explanation: The answer is "abc", with the length of 3.

Example 2:
Input: s = "bbbbb"
Output: 1
Explanation: The answer is "b", with the length of 1.

Example 3:
Input: s = "pwwkew"
Output: 3
Explanation: The answer is "wke", with the length of 3.

Constraints:
- 0 <= s.length <= 5 * 10^4
- s consists of English letters, digits, symbols and spaces.`,
    difficulty: "medium",
    topic: "strings",
    starterCode: `function lengthOfLongestSubstring(s) {\n  // Write your solution here\n  \n}`,
    testCases: [
      { input: { s: "abcabcbb" }, expected: 3 },
      { input: { s: "bbbbb" }, expected: 1 },
      { input: { s: "pwwkew" }, expected: 3 },
    ],
  },
  {
    title: "3Sum",
    description: `Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.

Notice that the solution set must not contain duplicate triplets.

Example 1:
Input: nums = [-1,0,1,2,-1,-4]
Output: [[-1,-1,2],[-1,0,1]]

Example 2:
Input: nums = [0,1,1]
Output: []

Example 3:
Input: nums = [0,0,0]
Output: [[0,0,0]]

Constraints:
- 3 <= nums.length <= 3000
- -10^5 <= nums[i] <= 10^5`,
    difficulty: "medium",
    topic: "arrays",
    starterCode: `function threeSum(nums) {\n  // Write your solution here\n  \n}`,
    testCases: [
      { input: { nums: [-1, 0, 1, 2, -1, -4] }, expected: [[-1, -1, 2], [-1, 0, 1]] },
      { input: { nums: [0, 1, 1] }, expected: [] },
      { input: { nums: [0, 0, 0] }, expected: [[0, 0, 0]] },
    ],
  },
  {
    title: "Binary Tree Level Order Traversal",
    description: `Given the root of a binary tree, return the level order traversal of its nodes' values. (i.e., from left to right, level by level).

Example 1:
Input: root = [3,9,20,null,null,15,7]
Output: [[3],[9,20],[15,7]]

Example 2:
Input: root = [1]
Output: [[1]]

Example 3:
Input: root = []
Output: []

Constraints:
- The number of nodes is in the range [0, 2000].
- -1000 <= Node.val <= 1000`,
    difficulty: "medium",
    topic: "trees",
    starterCode: `function levelOrder(root) {\n  // Write your solution here\n  \n}`,
    testCases: [
      { input: { root: [3, 9, 20, null, null, 15, 7] }, expected: [[3], [9, 20], [15, 7]] },
      { input: { root: [1] }, expected: [[1]] },
      { input: { root: [] }, expected: [] },
    ],
  },
  {
    title: "Number of Islands",
    description: `Given an m x n 2D binary grid which represents a map of '1's (land) and '0's (water), return the number of islands.

An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.

Example 1:
Input: grid = [
  ["1","1","1","1","0"],
  ["1","1","0","1","0"],
  ["1","1","0","0","0"],
  ["0","0","0","0","0"]
]
Output: 1

Example 2:
Input: grid = [
  ["1","1","0","0","0"],
  ["1","1","0","0","0"],
  ["0","0","1","0","0"],
  ["0","0","0","1","1"]
]
Output: 3

Constraints:
- m == grid.length
- n == grid[i].length
- 1 <= m, n <= 300
- grid[i][j] is '0' or '1'.`,
    difficulty: "medium",
    topic: "graphs",
    starterCode: `function numIslands(grid) {\n  // Write your solution here\n  \n}`,
    testCases: [
      {
        input: {
          grid: [
            ["1", "1", "1", "1", "0"],
            ["1", "1", "0", "1", "0"],
            ["1", "1", "0", "0", "0"],
            ["0", "0", "0", "0", "0"],
          ],
        },
        expected: 1,
      },
      {
        input: {
          grid: [
            ["1", "1", "0", "0", "0"],
            ["1", "1", "0", "0", "0"],
            ["0", "0", "1", "0", "0"],
            ["0", "0", "0", "1", "1"],
          ],
        },
        expected: 3,
      },
    ],
  },
  {
    title: "LRU Cache",
    description: `Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.

Implement the LRUCache class:
- LRUCache(int capacity) Initialize the LRU cache with positive size capacity.
- int get(int key) Return the value of the key if it exists, otherwise return -1.
- void put(int key, int value) Update the value of the key if it exists. Otherwise, add the key-value pair. If the number of keys exceeds the capacity, evict the least recently used key.

The functions get and put must each run in O(1) average time complexity.

Example:
Input: ["LRUCache","put","put","get","put","get","put","get","get","get"]
       [[2],[1,1],[2,2],[1],[3,3],[2],[4,4],[1],[3],[4]]
Output: [null,null,null,1,null,-1,null,-1,3,4]

Constraints:
- 1 <= capacity <= 3000
- 0 <= key <= 10^4
- 0 <= value <= 10^5`,
    difficulty: "medium",
    topic: "design",
    starterCode: `class LRUCache {\n  constructor(capacity) {\n    // Initialize your data structure\n    \n  }\n\n  get(key) {\n    // Return value or -1\n    \n  }\n\n  put(key, value) {\n    // Add or update key-value\n    \n  }\n}`,
    testCases: [
      {
        input: {
          operations: ["LRUCache", "put", "put", "get", "put", "get"],
          values: [[2], [1, 1], [2, 2], [1], [3, 3], [2]],
        },
        expected: [null, null, null, 1, null, -1],
      },
    ],
  },
  {
    title: "Validate Binary Search Tree",
    description: `Given the root of a binary tree, determine if it is a valid binary search tree (BST).

A valid BST is defined as follows:
- The left subtree of a node contains only nodes with keys less than the node's key.
- The right subtree of a node contains only nodes with keys greater than the node's key.
- Both the left and right subtrees must also be binary search trees.

Example 1:
Input: root = [2,1,3]
Output: true

Example 2:
Input: root = [5,1,4,null,null,3,6]
Output: false
Explanation: The root node's value is 5 but its right child's value is 4.

Constraints:
- The number of nodes is in the range [1, 10^4].
- -2^31 <= Node.val <= 2^31 - 1`,
    difficulty: "medium",
    topic: "trees",
    starterCode: `function isValidBST(root) {\n  // Write your solution here\n  \n}`,
    testCases: [
      { input: { root: [2, 1, 3] }, expected: true },
      { input: { root: [5, 1, 4, null, null, 3, 6] }, expected: false },
    ],
  },
  {
    title: "Course Schedule",
    description: `There are a total of numCourses courses you have to take, labeled from 0 to numCourses - 1. You are given an array prerequisites where prerequisites[i] = [ai, bi] indicates that you must take course bi first if you want to take course ai.

Return true if you can finish all courses. Otherwise, return false.

Example 1:
Input: numCourses = 2, prerequisites = [[1,0]]
Output: true
Explanation: You can take course 0 then course 1.

Example 2:
Input: numCourses = 2, prerequisites = [[1,0],[0,1]]
Output: false
Explanation: Circular dependency.

Constraints:
- 1 <= numCourses <= 2000
- 0 <= prerequisites.length <= 5000`,
    difficulty: "medium",
    topic: "graphs",
    starterCode: `function canFinish(numCourses, prerequisites) {\n  // Write your solution here\n  \n}`,
    testCases: [
      { input: { numCourses: 2, prerequisites: [[1, 0]] }, expected: true },
      { input: { numCourses: 2, prerequisites: [[1, 0], [0, 1]] }, expected: false },
    ],
  },

  // ==================== HARD ====================
  {
    title: "Median of Two Sorted Arrays",
    description: `Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.

The overall run time complexity should be O(log (m+n)).

Example 1:
Input: nums1 = [1,3], nums2 = [2]
Output: 2.0
Explanation: merged array = [1,2,3] and median is 2.

Example 2:
Input: nums1 = [1,2], nums2 = [3,4]
Output: 2.5
Explanation: merged array = [1,2,3,4] and median is (2 + 3) / 2 = 2.5.

Constraints:
- nums1.length == m
- nums2.length == n
- 0 <= m <= 1000
- 0 <= n <= 1000
- 1 <= m + n <= 2000
- -10^6 <= nums1[i], nums2[i] <= 10^6`,
    difficulty: "hard",
    topic: "arrays",
    starterCode: `function findMedianSortedArrays(nums1, nums2) {\n  // Write your solution here\n  \n}`,
    testCases: [
      { input: { nums1: [1, 3], nums2: [2] }, expected: 2.0 },
      { input: { nums1: [1, 2], nums2: [3, 4] }, expected: 2.5 },
    ],
  },
  {
    title: "Merge K Sorted Lists",
    description: `You are given an array of k linked-lists, each linked-list is sorted in ascending order.

Merge all the linked-lists into one sorted linked-list and return it.

Example 1:
Input: lists = [[1,4,5],[1,3,4],[2,6]]
Output: [1,1,2,3,4,4,5,6]

Example 2:
Input: lists = []
Output: []

Example 3:
Input: lists = [[]]
Output: []

Constraints:
- k == lists.length
- 0 <= k <= 10^4
- 0 <= lists[i].length <= 500
- -10^4 <= lists[i][j] <= 10^4`,
    difficulty: "hard",
    topic: "linked-lists",
    starterCode: `function mergeKLists(lists) {\n  // Write your solution here\n  \n}`,
    testCases: [
      { input: { lists: [[1, 4, 5], [1, 3, 4], [2, 6]] }, expected: [1, 1, 2, 3, 4, 4, 5, 6] },
      { input: { lists: [] }, expected: [] },
    ],
  },
  {
    title: "Trapping Rain Water",
    description: `Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.

Example 1:
Input: height = [0,1,0,2,1,0,1,3,2,1,2,1]
Output: 6

Example 2:
Input: height = [4,2,0,3,2,5]
Output: 9

Constraints:
- n == height.length
- 1 <= n <= 2 * 10^4
- 0 <= height[i] <= 10^5`,
    difficulty: "hard",
    topic: "arrays",
    starterCode: `function trap(height) {\n  // Write your solution here\n  \n}`,
    testCases: [
      { input: { height: [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1] }, expected: 6 },
      { input: { height: [4, 2, 0, 3, 2, 5] }, expected: 9 },
    ],
  },
  {
    title: "Word Ladder",
    description: `Given two words beginWord and endWord, and a dictionary wordList, return the number of words in the shortest transformation sequence from beginWord to endWord, or 0 if no such sequence exists.

Each transformed word must exist in the word list. Only one letter can be changed at a time.

Example 1:
Input: beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log","cog"]
Output: 5
Explanation: "hit" -> "hot" -> "dot" -> "dog" -> "cog"

Example 2:
Input: beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log"]
Output: 0

Constraints:
- 1 <= beginWord.length <= 10
- All words have the same length.
- 1 <= wordList.length <= 5000`,
    difficulty: "hard",
    topic: "graphs",
    starterCode: `function ladderLength(beginWord, endWord, wordList) {\n  // Write your solution here\n  \n}`,
    testCases: [
      {
        input: {
          beginWord: "hit",
          endWord: "cog",
          wordList: ["hot", "dot", "dog", "lot", "log", "cog"],
        },
        expected: 5,
      },
      {
        input: {
          beginWord: "hit",
          endWord: "cog",
          wordList: ["hot", "dot", "dog", "lot", "log"],
        },
        expected: 0,
      },
    ],
  },
];

async function main() {
  console.log("🌱 Seeding problems...\n");

  // Clear existing problems — delete room_problems links first to avoid FK violation
  await prisma.roomProblem.deleteMany({
    where: { problem: { createdById: null } },
  });
  await prisma.problem.deleteMany({
    where: { createdById: null },
  });

  for (const problem of problems) {
    const created = await prisma.problem.create({
      data: {
        title: problem.title,
        description: problem.description,
        difficulty: problem.difficulty,
        topic: problem.topic,
        starterCode: problem.starterCode,
        testCases: problem.testCases,
        createdById: null, // null = pre-loaded, not user-created
      },
    });

    console.log(`  ✅ ${created.difficulty.toUpperCase().padEnd(6)} | ${created.topic.padEnd(12)} | ${created.title}`);
  }

  console.log(`\n🎉 Seeded ${problems.length} problems successfully!\n`);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });   