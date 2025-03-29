const getBusinessOwners = async (req, res) => {
  try {
    // Fetch users with role 'business-owner' and join with businesses
    const businessOwners = await User.aggregate([
      {
        $match: { role: 'business-owner' }
      },
      {
        $lookup: {
          from: 'businesses',
          localField: 'businessId',
          foreignField: 'businessId',
          as: 'business'
        }
      },
      {
        $project: {
          email: 1,
          businessName: { $arrayElemAt: ['$business.businessName', 0] },
          status: 1
        }
      }
    ]);

    res.json(businessOwners);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch business owners' });
  }
}; 