import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, Button, Tabs, Tab } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { supabase } from "../utils/supabaseClient";
import {
  GoogleMap,
  LoadScript,
  Autocomplete,
  Libraries,
  Marker,
} from "@react-google-maps/api";

interface Venue {
  venue_id: number;
  venue_nm: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  usage_count: number;
}

interface VenueUsage {
  venue_id: number;
  count: number;
}

interface PlaceSelectModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (venue: { id: number; name: string }) => void;
}

// コンポーネントの外で定義
const LIBRARIES: Libraries = ["places"];

const PlaceSelectModal: React.FC<PlaceSelectModalProps> = ({
  open,
  onClose,
  onSelect,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [savedVenues, setSavedVenues] = useState<Venue[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [center, setCenter] = useState({ lat: 35.6812, lng: 139.7671 }); // 東京駅をデフォルトに
  const [selectedPlace, setSelectedPlace] =
    useState<google.maps.places.PlaceResult | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [markerPosition, setMarkerPosition] =
    useState<google.maps.LatLng | null>(null);
  const [venueName, setVenueName] = useState("");

  // LoadScriptをコンポーネントの外に移動するため、useMemoを使用
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // SearchBoxコンポーネントのスタイル定義
  const searchBoxStyle = {
    boxSizing: "border-box" as const,
    width: "100%",
    height: "40px",
    padding: "0 12px",
    borderRadius: "4px",
    backgroundColor: "#1D1D21",
    color: "#FCFCFC",
  };

  useEffect(() => {
    if (open) {
      fetchVenuesWithUsageCount();
    }
  }, [open]);

  useEffect(() => {
    // モーダルが閉じられたときの処理
    if (!open) {
      setScriptLoaded(false);
      setSelectedPlace(null);
      setMarkerPosition(null);
      setVenueName("");
      setCenter({ lat: 35.6812, lng: 139.7671 });
    }
  }, [open]);

  const fetchVenuesWithUsageCount = async () => {
    // 使用回数の集計をSQLで実行
    const { data: usageData } = await supabase.rpc("count_venue_usage"); // カスタム関数を使用

    // 使用回数をMapに変換
    const usageCountMap = new Map<number, number>(
      usageData?.map((item: VenueUsage) => [item.venue_id, item.count]) || []
    );

    // 全ての会場を取得
    const { data: venues } = await supabase
      .from("EVENT_VENUE")
      .select("*")
      .order("venue_nm");

    if (venues) {
      // 会場データと使用回数を結合
      const venuesWithCount = venues
        .map((venue) => ({
          ...venue,
          usage_count: usageCountMap.get(venue.venue_id) || 0,
        }))
        // 使用回数で降順ソート
        .sort((a, b) => b.usage_count - a.usage_count)
        // 上位10件を取得
        .slice(0, 10);

      setSavedVenues(venuesWithCount);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    // 地図関連の状態をリセット
    setSelectedPlace(null);
    setMarkerPosition(null);
    setVenueName("");
    setCenter({ lat: 35.6812, lng: 139.7671 }); // 東京駅に戻す
  };

  const handleVenueSelect = (venue: Venue) => {
    onSelect({
      id: venue.venue_id,
      name: venue.venue_nm,
    });
    onClose();
  };

  const handlePlaceSelect = () => {
    if (!autocompleteRef.current) return;

    // 入力フィールドから直接テキストを取得
    const inputElement = document.querySelector(
      ".pac-target-input"
    ) as HTMLInputElement;
    const searchText = inputElement?.value || "";

    if (!searchText.trim()) {
      return; // 検索テキストが空の場合は何もしない
    }

    const place = autocompleteRef.current.getPlace();

    // 場所が選択されていない場合（検索ボタンをクリックした場合など）
    if (!place || !place.geometry) {
      // 検索クエリを使用して場所を取得
      const service = new google.maps.places.PlacesService(mapRef.current!);
      service.findPlaceFromQuery(
        {
          query: searchText,
          fields: ["geometry", "name", "formatted_address"],
        },
        (results, status) => {
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            results &&
            results[0]
          ) {
            const selectedPlace = results[0];

            if (selectedPlace.geometry && selectedPlace.geometry.location) {
              const location = {
                lat: selectedPlace.geometry.location.lat(),
                lng: selectedPlace.geometry.location.lng(),
              };
              setCenter(location);
              setSelectedPlace(selectedPlace);
              setMarkerPosition(selectedPlace.geometry.location);
              setVenueName(""); // 名称をクリア

              if (mapRef.current) {
                mapRef.current.panTo(location);
                mapRef.current.setZoom(15);
              }
            }
          }
        }
      );
      return;
    }

    // 通常の処理（Autocompleteから場所が選択された場合）
    if (!place.geometry?.location) return;

    const location = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    };

    setVenueName(""); // 検索結果の名称をクリア
    setCenter(location);
    setSelectedPlace(place);
    setMarkerPosition(place.geometry.location);

    if (mapRef.current) {
      mapRef.current.panTo(location);
      mapRef.current.setZoom(15);
    }
  };

  const handleMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
  };

  const handleMapClick = async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;

    const clickedLocation = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
    };

    // クリックした位置にマーカーを設置
    setMarkerPosition(e.latLng);
    setCenter(clickedLocation);

    // 逆ジオコーディングで住所情報を取得
    const geocoder = new google.maps.Geocoder();
    const result = await new Promise((resolve) => {
      geocoder.geocode({ location: clickedLocation }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          resolve(results[0]);
        } else {
          resolve(null);
        }
      });
    });

    if (result) {
      const place = result as google.maps.GeocoderResult;
      setSelectedPlace({
        name: place.formatted_address,
        formatted_address: place.formatted_address,
        geometry: place.geometry,
      } as google.maps.places.PlaceResult);
      setVenueName(""); // 名称をクリア
    }
  };

  const handleSavePlace = async () => {
    if (!venueName.trim()) {
      alert("場所の名称を入力してください");
      return;
    }

    if (selectedPlace && selectedPlace.formatted_address) {
      const newVenue = {
        venue_nm: venueName.trim(),
        address: selectedPlace.formatted_address,
        latitude: selectedPlace.geometry?.location?.lat(),
        longitude: selectedPlace.geometry?.location?.lng(),
      };

      const { data } = await supabase
        .from("EVENT_VENUE")
        .insert([newVenue])
        .select()
        .single();

      if (data) {
        onSelect({
          id: data.venue_id,
          name: data.venue_nm,
        });
        onClose();
      }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        style: {
          backgroundColor: "#2D2D33",
          color: "#FCFCFC",
          maxHeight: "80vh",
          margin: "24px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
    >
      <DialogContent>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            marginBottom: 1,
            minHeight: "36px",
            "& .MuiTab-root": {
              color: "#FCFCFC",
              minHeight: "36px",
              padding: "6px 16px",
              fontSize: "0.875rem",
              borderBottom: "2px solid #3D3D43",
            },
            "& .Mui-selected": {
              color: "#8E93DA",
            },
            "& .MuiTabs-indicator": {
              height: "2px",
              backgroundColor: "#8E93DA",
              transition: "all 0.3s",
            },
          }}
        >
          <Tab label="よく利用する場所" />
          <Tab label="地図から検索" />
        </Tabs>

        {tabValue === 0 && (
          <div className="flex flex-col gap-2 h-[calc(100vh-327px)] max-h-[60vh]">
            <div className="relative mb-2 pt-2 flex gap-2">
              <input
                type="text"
                placeholder="場所を検索..."
                className="w-full bg-[#1D1D21] rounded p-2 text-[#FCFCFC]"
                style={searchBoxStyle}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {savedVenues.length > 0 ? (
                savedVenues
                  .filter(
                    (venue) =>
                      venue.venue_nm
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                      venue.address
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                  )
                  .map((venue) => (
                    <div
                      key={venue.venue_id}
                      className="p-3 bg-[#1D1D21] rounded mb-2 cursor-pointer hover:bg-[#3D3D43]"
                      onClick={() => handleVenueSelect(venue)}
                    >
                      <div className="font-bold">{venue.venue_nm || ""}</div>
                      <div className="text-sm text-gray-400">
                        {venue.address || ""}
                      </div>
                    </div>
                  ))
              ) : (
                <div className="p-4 text-center text-gray-400">
                  登録されている場所がありません
                </div>
              )}
            </div>
          </div>
        )}

        {tabValue === 1 && (
          <div className="flex flex-col gap-2 max-h-[60vh]">
            <LoadScript
              googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
              libraries={LIBRARIES}
              onLoad={() => setScriptLoaded(true)}
            >
              {scriptLoaded && (
                <>
                  <div className="relative mb-2 flex gap-2">
                    <Autocomplete
                      onLoad={(autocomplete) => {
                        console.log("Autocomplete loaded");
                        autocompleteRef.current = autocomplete;
                      }}
                      onPlaceChanged={handlePlaceSelect}
                      className="flex-1"
                    >
                      <input
                        type="text"
                        placeholder="場所を検索..."
                        className="w-full bg-[#1D1D21] rounded p-2 text-[#FCFCFC]"
                        style={searchBoxStyle}
                      />
                    </Autocomplete>
                    <Button
                      variant="contained"
                      onClick={handlePlaceSelect}
                      sx={{
                        width: "40px",
                        height: "40px",
                        minWidth: "40px",
                        padding: 0,
                        backgroundColor: "#5b63d3",
                        "&:hover": {
                          backgroundColor: "#4a51b8",
                        },
                      }}
                    >
                      <SearchIcon />
                    </Button>
                  </div>

                  <GoogleMap
                    mapContainerClassName="w-full aspect-square rounded"
                    center={center}
                    zoom={15}
                    onLoad={handleMapLoad}
                    onClick={handleMapClick}
                    options={{
                      mapTypeControl: false,
                      streetViewControl: false,
                      fullscreenControl: false,
                      zoomControl: false,
                      panControl: false,
                      styles: [
                        {
                          featureType: "all",
                          elementType: "geometry",
                          stylers: [{ color: "#242f3e" }],
                        },
                        {
                          featureType: "road",
                          elementType: "geometry",
                          stylers: [{ color: "#38414e" }],
                        },
                        {
                          featureType: "road",
                          elementType: "geometry.stroke",
                          stylers: [{ color: "#212a37" }],
                        },
                        {
                          featureType: "road",
                          elementType: "labels.text.fill",
                          stylers: [{ color: "#9ca5b3" }],
                        },
                      ],
                    }}
                  >
                    {markerPosition && (
                      <Marker
                        position={markerPosition}
                        animation={google.maps.Animation.DROP}
                      />
                    )}
                  </GoogleMap>
                </>
              )}
            </LoadScript>

            <div className="p-3 bg-[#1D1D21] rounded mt-2 flex flex-col">
              <div className="flex-1">
                <input
                  type="text"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  className="w-full bg-[#2D2D33] rounded p-2 text-[#FCFCFC] mb-2"
                  placeholder="場所の名称を入力 *"
                  disabled={!selectedPlace}
                  required
                />
                <div className="text-sm text-gray-400 min-h-[1.5rem] pb-2">
                  {selectedPlace?.formatted_address || "場所を検索してください"}
                </div>
              </div>
              <div className="flex gap-2 mt-auto">
                <Button
                  onClick={onClose}
                  fullWidth
                  variant="outlined"
                  sx={{
                    py: 1,
                    borderColor: "#3D3D43",
                    color: "#FCFCFC",
                    "&:hover": {
                      borderColor: "#8E93DA",
                      backgroundColor: "rgba(142, 147, 218, 0.1)",
                    },
                  }}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleSavePlace}
                  disabled={!selectedPlace}
                  fullWidth
                  variant="contained"
                  sx={{
                    py: 1,
                    backgroundColor: selectedPlace ? "#5b63d3" : "#4D4D53",
                    color: "#FCFCFC",
                    "&:hover": {
                      backgroundColor: selectedPlace ? "#4a51b8" : "#4D4D53",
                    },
                    "&:disabled": {
                      backgroundColor: "#4D4D53",
                      color: "#8D8D93",
                    },
                  }}
                >
                  場所を保存
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PlaceSelectModal;
