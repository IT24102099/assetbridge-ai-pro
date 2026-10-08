namespace AssetBridge.Application.Common.Constants;

// Authoritative reference data for Sri Lankan administrative districts and major cities/towns.
// Used to enforce district-city consistency across property asset registrations and provider matching.
public static class SriLankaLocationData
{
    private static readonly Dictionary<string, HashSet<string>> DistrictCities = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Colombo"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "Colombo", "Colombo 01", "Colombo 02", "Colombo 03", "Colombo 04", "Colombo 05",
            "Colombo 06", "Colombo 07", "Colombo 08", "Colombo 09", "Colombo 10", "Colombo 11",
            "Colombo 12", "Colombo 13", "Colombo 14", "Colombo 15", "Dehiwala", "Mount Lavinia",
            "Moratuwa", "Sri Jayawardenepura Kotte", "Kotte", "Nugegoda", "Maharagama", "Homagama",
            "Kesbewa", "Battaramulla", "Kaduwela", "Piliyandala", "Ratmalana", "Kolonnawa",
            "Rajagiriya", "Malabe", "Kohuwala", "Wellawatte", "Bambalapitiya", "Kollupitiya"
        },
        ["Gampaha"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "Gampaha", "Negombo", "Kelaniya", "Wattala", "Ja-Ela", "Kadawatha", "Kiribathgoda",
            "Minuwangoda", "Mirigama", "Ragama", "Divulapitiya", "Nittambuwa", "Veyangoda",
            "Katunayake", "Biyagama", "Delgoda", "Seeduwa", "Peliyagoda"
        },
        ["Kalutara"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "Kalutara", "Panadura", "Horana", "Beruwala", "Matugama", "Aluthgama", "Wadduwa",
            "Bandaragama", "Ingiriya", "Bulathsinhala", "Dodangoda", "Payagala"
        },
        ["Kandy"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "Kandy", "Peradeniya", "Gampola", "Katugastota", "Kundasale", "Nawalapitiya",
            "Kadugannawa", "Pilimathalawa", "Digana", "Teldeniya", "Akurana", "Wattegama",
            "Gelioya", "Ampitiya"
        },
        ["Matale"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "Matale", "Dambulla", "Sigiriya", "Ukuwela", "Rattota", "Galewela", "Pallepola", "Naula"
        },
        ["Nuwara Eliya"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "Nuwara Eliya", "Hatton", "Talawakele", "Ginigathena", "Maskeliya", "Kotagala",
            "Walapane", "Hanguranketha", "Nanu Oya", "Ragala"
        },
        ["Galle"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "Galle", "Hikkaduwa", "Ambalangoda", "Bentota", "Baddegama", "Elpitiya", "Karapitiya",
            "Unawatuna", "Ahangama", "Koggala", "Batapola", "Habaraduwa"
        },
        ["Matara"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "Matara", "Weligama", "Dikwella", "Akuressa", "Kamburupitiya", "Deniyaya",
            "Hakmana", "Mirissa", "Devinuwara", "Gandara"
        },
        ["Hambantota"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "Hambantota", "Tangalle", "Tissamaharama", "Ambalantota", "Beliatta", "Walasmulla",
            "Weeraketiya", "Middeniya"
        },
        ["Jaffna"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "Jaffna", "Nallur", "Chavakachcheri", "Point Pedro", "Valvettithurai", "Karainagar",
            "Kopay", "Manipay", "Chankanai", "Vaddukoddai", "Atchuvely", "Chunnakam"
        },
        ["Kilinochchi"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "Kilinochchi", "Paranthan", "Poonakary", "Pallai"
        },
        ["Mannar"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "Mannar", "Madhu", "Nanaddan", "Pesalai", "Murunkan"
        },
        ["Vavuniya"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "Vavuniya", "Nedunkeni", "Cheddikulam", "Omanthai"
        },
        ["Mullaitivu"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "Mullaitivu", "Oddusuddan", "Puthukkudiyiruppu", "Mulliyawalai"
        },
        ["Batticaloa"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "Batticaloa", "Kattankudy", "Eravur", "Valaichchenai", "Oddamavadi", "Kaluwanchikudy"
        },
        ["Ampara"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "Ampara", "Kalmunai", "Sammanthurai", "Akkaraipattu", "Sainthamaruthu", "Pottuvil",
            "Uhana", "Dehiattakandiya"
        },
        ["Trincomalee"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "Trincomalee", "Kinniya", "Mutur", "Kantale", "Nilaveli", "Kuchchaveli"
        },
        ["Kurunegala"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "Kurunegala", "Kuliyapitiya", "Pannala", "Narammala", "Wariyapola", "Mawathagama",
            "Polgahawela", "Alawwa", "Ibbagamuwa", "Giriulla", "Hettipola"
        },
        ["Puttalam"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "Puttalam", "Chilaw", "Wennappuwa", "Marawila", "Anamaduwa", "Dankotuwa",
            "Nattandiya", "Kalpitiya", "Madampe", "Mahawewa"
        },
        ["Anuradhapura"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "Anuradhapura", "Medawachchiya", "Kekirawa", "Tambuttegama", "Eppawala", "Mihintale",
            "Galnewa", "Nochchiyagama", "Habarana"
        },
        ["Polonnaruwa"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "Polonnaruwa", "Kaduruwela", "Medirigiriya", "Hingurakgoda", "Dimbulagala", "Welikanda"
        },
        ["Badulla"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "Badulla", "Bandarawela", "Haputale", "Ella", "Diyatalawa", "Mahiyanganaya",
            "Hali Ela", "Passara", "Welimada"
        },
        ["Monaragala"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "Monaragala", "Wellawaya", "Bibile", "Buttala", "Kataragama", "Siyambalanduwa"
        },
        ["Ratnapura"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "Ratnapura", "Balangoda", "Pelmadulla", "Embilipitiya", "Kuruwita", "Eheliyagoda",
            "Kahawatta", "Rakwana"
        },
        ["Kegalle"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "Kegalle", "Mawanella", "Warakapola", "Rambukkana", "Yatiyantota", "Ruwanwella",
            "Dehiowita", "Galigamuwa"
        }
    };

    public static IReadOnlyCollection<string> Districts => DistrictCities.Keys;

    public static bool IsValidDistrict(string district)
    {
        if (string.IsNullOrWhiteSpace(district)) return false;
        return DistrictCities.ContainsKey(district.Trim());
    }

    public static bool IsValidDistrictCityCombination(string district, string city)
    {
        if (string.IsNullOrWhiteSpace(district) || string.IsNullOrWhiteSpace(city))
            return false;

        var dTrim = district.Trim();
        var cTrim = city.Trim();

        // 1. If the district is not recognized, fail validation
        if (!DistrictCities.TryGetValue(dTrim, out var validCities))
            return false;

        // 2. If the city is in the district's recognized cities list, pass
        if (validCities.Contains(cTrim))
            return true;

        // 3. If the city name is itself another district capital/name (e.g. City="Jaffna" with District="Puttalam"), fail
        foreach (var entry in DistrictCities)
        {
            if (!string.Equals(entry.Key, dTrim, StringComparison.OrdinalIgnoreCase))
            {
                // If it matches another district name or one of that other district's major cities
                if (string.Equals(entry.Key, cTrim, StringComparison.OrdinalIgnoreCase) || entry.Value.Contains(cTrim))
                {
                    return false;
                }
            }
        }

        // 4. If it's a specific custom local town/village name not conflicting with another district, allow it
        return true;
    }

    public static IReadOnlyCollection<string> GetCitiesForDistrict(string district)
    {
        if (string.IsNullOrWhiteSpace(district)) return Array.Empty<string>();
        return DistrictCities.TryGetValue(district.Trim(), out var cities)
            ? cities
            : Array.Empty<string>();
    }
}
