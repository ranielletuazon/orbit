import { format } from "date-fns";

// Mock date-fns format function
jest.mock("date-fns", () => ({
    format: jest.fn((date, formatString) => {
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    }),
}));

describe("getRelativeTime function", () => {
    const getRelativeTimeForTest = (diffInSeconds: number) => {
        // Create a reference date
        const now = new Date();

        // Calculate the message date based on the diff in seconds
        const messageDate = new Date(now.getTime() - diffInSeconds * 1000);

        // Time frames 
        const timeFrames = [
            { limit: 3600, unit: "minute", divisor: 60 },
            { limit: 86400, unit: "hour", divisor: 3600 },
            { limit: 604800, unit: "day", divisor: 86400 },
            { limit: 2629800, unit: "week", divisor: 604800 },
            { limit: 31557600, unit: "month", divisor: 2629800 },
            { limit: Infinity, unit: "year", divisor: 31557600 },
        ];

        for (const { limit, unit, divisor } of timeFrames) {
            if (diffInSeconds < limit) {
                const value = Math.floor(diffInSeconds / divisor);
                return value <= 0
                    ? "Just now"
                    : `${value} ${unit}${value > 1 ? "s" : ""} ago`;
            }
        }

        return format(messageDate, "MM/dd/yyyy");
    };

    // Test cases
    test('should return "Just now" for timestamps within the last minute', () => {
        expect(getRelativeTimeForTest(30)).toBe("Just now");
    });

    test("should return minutes for timestamps within the last hour", () => {
        expect(getRelativeTimeForTest(600)).toBe("10 minutes ago");
    });

    test('should return singular "minute" for 1 minute ago', () => {
        expect(getRelativeTimeForTest(60)).toBe("1 minute ago");
    });

    test("should return hours for timestamps within the last day", () => {
        expect(getRelativeTimeForTest(5 * 3600)).toBe("5 hours ago");
    });

    test('should return singular "hour" for 1 hour ago', () => {
        expect(getRelativeTimeForTest(3600)).toBe("1 hour ago");
    });

    test("should return days for timestamps within the last week", () => {
        expect(getRelativeTimeForTest(3 * 86400)).toBe("3 days ago");
    });

    test('should return singular "day" for 1 day ago', () => {
        expect(getRelativeTimeForTest(86400)).toBe("1 day ago");
    });

    test("should return weeks for timestamps within the last month", () => {
        expect(getRelativeTimeForTest(2 * 604800)).toBe("2 weeks ago");
    });

    test('should return singular "week" for 1 week ago', () => {
        expect(getRelativeTimeForTest(604800)).toBe("1 week ago");
    });

    test("should return months for timestamps within the last year", () => {
        expect(getRelativeTimeForTest(3 * 2629800)).toBe("3 months ago");
    });

    test('should return singular "month" for 1 month ago', () => {
        expect(getRelativeTimeForTest(2629800)).toBe("1 month ago");
    });

    test("should return years for timestamps older than a year", () => {
        expect(getRelativeTimeForTest(2 * 31557600)).toBe("2 years ago");
    });

    test('should return singular "year" for 1 year ago', () => {
        expect(getRelativeTimeForTest(31557600)).toBe("1 year ago");
    });
});
