describe("generateChatID function", () => {
    const generateChatID = (user1ID: string, user2ID: string) => {
        return user1ID < user2ID
            ? `${user1ID}_${user2ID}`
            : `${user2ID}_${user1ID}`;
    };

    test("should return the same ID regardless of parameter order", () => {
        const user1ID = "abc123";
        const user2ID = "xyz789";

        const chatID1 = generateChatID(user1ID, user2ID);
        const chatID2 = generateChatID(user2ID, user1ID);

        expect(chatID1).toBe(chatID2);
    });

    test("should put IDs in lexicographical order with smaller ID first", () => {
        const smallerID = "abc123";
        const largerID = "xyz789";

        const expectedChatID = `${smallerID}_${largerID}`;
        const actualChatID = generateChatID(smallerID, largerID);

        expect(actualChatID).toBe(expectedChatID);
    });

    test("should correctly handle IDs when the first parameter is lexicographically larger", () => {
        const smallerID = "abc123";
        const largerID = "xyz789";

        const expectedChatID = `${smallerID}_${largerID}`;
        const actualChatID = generateChatID(largerID, smallerID);

        expect(actualChatID).toBe(expectedChatID);
    });

    test("should handle numeric IDs correctly", () => {
        const user1ID = "123";
        const user2ID = "456";

        const expectedChatID = `${user1ID}_${user2ID}`;
        const actualChatID = generateChatID(user1ID, user2ID);

        expect(actualChatID).toBe(expectedChatID);
    });

    test("should handle same IDs correctly", () => {
        const sameID = "user123";

        const expectedChatID = `${sameID}_${sameID}`;
        const actualChatID = generateChatID(sameID, sameID);

        expect(actualChatID).toBe(expectedChatID);
    });

    test("should handle empty strings correctly", () => {
        const emptyID = "";
        const nonEmptyID = "user123";

        const expectedChatID = `${emptyID}_${nonEmptyID}`;
        const actualChatID = generateChatID(nonEmptyID, emptyID);

        expect(actualChatID).toBe(expectedChatID);
    });
});
