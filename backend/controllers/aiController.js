const { asyncHandler } = require('../utils/asyncHandler');
// const { callGemini } = require('../utils/gemini'); // If available later

const suggestResolution = asyncHandler(async (req, res) => {
    const { title, description, category } = req.body;

    // Simulation of AI Logic based on keywords
    // In production, this would call Gemini/OpenAI

    let steps = [];
    let resources = [];

    const lowerDesc = (description + " " + title).toLowerCase();

    if (lowerDesc.includes('pothole') || lowerDesc.includes('road')) {
        steps = [
            "1. Cordon off the affected area with safety cones.",
            "2. Clean the pothole of debris and water.",
            "3. Apply tack coat adhesive.",
            "4. Fill with cold mix asphalt and compact clearly."
        ];
        resources = ["Asphalt Mix", "Compactor", "Safety Cones"];
    } else if (lowerDesc.includes('garbage') || lowerDesc.includes('trash') || lowerDesc.includes('waste')) {
        steps = [
            "1. Dispatch waste collection vehicle to location.",
            "2. Verify waste segregation status.",
            "3. Collect waste and clean immediate surroundings.",
            "4. Spray disinfectant if necessary."
        ];
        resources = ["Garbage Truck", "Sanitation Crew", "Disinfectant"];
    } else if (lowerDesc.includes('light') || lowerDesc.includes('electric') || lowerDesc.includes('pole')) {
        steps = [
            "1. Verify power status at the feeder pillar.",
            "2. Inspect the pole/fixture for physical damage.",
            "3. Replace bulb or fuse if blown.",
            "4. Reset timer/photocell if functionality check fails."
        ];
        resources = ["Electrician Kit", "Ladder Truck", "Spare Bulbs"];
    } else if (lowerDesc.includes('water') || lowerDesc.includes('leak') || lowerDesc.includes('pipe')) {
        steps = [
            "1. Isolate the water supply to the leaking section.",
            "2. Excavate to expose the damaged pipe.",
            "3. Install clamp or replace pipe section.",
            "4. Flush line and test for leaks before backfilling."
        ];
        resources = ["Excavator", "Pipe Clamps", "Water Pump"];
    } else {
        // Generic / Default
        steps = [
            "1. Conduct on-site assessment.",
            "2. Identify safety hazards and secure perimeter.",
            "3. Coordinate with relevant specialized department.",
            "4. Document resolution with 'After' photos."
        ];
        resources = ["Assessment Checklist", "Camera", "Safety Gear"];
    }

    // Artificial delay for "AI Thinking" effect
    await new Promise(r => setTimeout(r, 1500));

    res.json({
        steps,
        resources,
        confidence: 0.92
    });
});

module.exports = { suggestResolution };
