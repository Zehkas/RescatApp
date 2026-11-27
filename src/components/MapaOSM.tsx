// Mapa basado en Leaflet dentro de un WebView.
// Reemplaza a react-native-maps, que en Android siempre usa el SDK de Google Maps
// y cierra la app si no hay una API key configurada.
import { ComponentType, forwardRef, Ref, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { WebView as WebViewOriginal, WebViewMessageEvent, WebViewProps } from 'react-native-webview';

// Los tipos de react-native-webview 14 declaran el componente como
// `Component<WebViewProps & undefined>`, que TypeScript reduce a `never`.
// Se re-tipa con los props correctos; el componente en sí no cambia.
type WebViewHandle = { injectJavaScript: (script: string) => void };
const WebView = WebViewOriginal as unknown as ComponentType<WebViewProps & { ref?: Ref<WebViewHandle> }>;

export type Coordenada = {
  latitude: number;
  longitude: number;
};

export type MarcadorMapa = Coordenada & {
  id: string;
  titulo?: string;
  descripcion?: string;
  color?: string;
};

export type MapaOSMRef = {
  volarA: (coordenada: Coordenada, zoom?: number) => void;
};

type Props = {
  centro: Coordenada;
  zoom?: number;
  marcadores?: MarcadorMapa[];
  ubicacionUsuario?: Coordenada | null;
  onPress?: (coordenada: Coordenada) => void;
  onMarcadorPress?: (id: string) => void;
  style?: StyleProp<ViewStyle>;
};

const crearHtml = (centro: Coordenada, zoom: number) => `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #mapa { height: 100%; width: 100%; margin: 0; padding: 0; }
    .leaflet-popup-content { font-family: sans-serif; }
    .titulo { font-weight: bold; margin-bottom: 2px; }
  </style>
</head>
<body>
  <div id="mapa"></div>
  <script>
    function enviar(datos) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(datos));
      }
    }

    var mapa = L.map('mapa', { zoomControl: true }).setView([${centro.latitude}, ${centro.longitude}], ${zoom});

    // Teselas de OpenStreetMap. No requieren API key.
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(mapa);

    var capaMarcadores = L.layerGroup().addTo(mapa);
    var marcadorUsuario = null;

    mapa.on('click', function (e) {
      enviar({ tipo: 'press', latitude: e.latlng.lat, longitude: e.latlng.lng });
    });

    function crearPopup(m) {
      var div = document.createElement('div');
      if (m.titulo) {
        var t = document.createElement('div');
        t.className = 'titulo';
        t.textContent = m.titulo;
        div.appendChild(t);
      }
      if (m.descripcion) {
        var d = document.createElement('div');
        d.textContent = m.descripcion;
        div.appendChild(d);
      }
      return div;
    }

    window.setMarcadores = function (lista) {
      capaMarcadores.clearLayers();
      lista.forEach(function (m) {
        var marcador = L.circleMarker([m.latitude, m.longitude], {
          radius: 10,
          color: '#ffffff',
          weight: 2,
          fillColor: m.color || 'red',
          fillOpacity: 1
        });
        if (m.titulo || m.descripcion) {
          marcador.bindPopup(crearPopup(m));
        }
        marcador.on('click', function (e) {
          L.DomEvent.stopPropagation(e);
          enviar({ tipo: 'marcador', id: m.id });
        });
        marcador.addTo(capaMarcadores);
      });
    };

    window.setUbicacionUsuario = function (u) {
      if (marcadorUsuario) {
        mapa.removeLayer(marcadorUsuario);
        marcadorUsuario = null;
      }
      if (u) {
        marcadorUsuario = L.circleMarker([u.latitude, u.longitude], {
          radius: 7,
          color: '#ffffff',
          weight: 2,
          fillColor: '#1E88E5',
          fillOpacity: 1
        }).addTo(mapa);
      }
    };

    window.volarA = function (lat, lng, zoom) {
      mapa.flyTo([lat, lng], zoom || mapa.getZoom(), { duration: 0.5 });
    };

    window.centrar = function (lat, lng) {
      mapa.setView([lat, lng], mapa.getZoom());
    };

    enviar({ tipo: 'listo' });
  </script>
</body>
</html>`;

const MapaOSM = forwardRef<MapaOSMRef, Props>(function MapaOSM(
  { centro, zoom = 15, marcadores = [], ubicacionUsuario = null, onPress, onMarcadorPress, style },
  ref
) {
  const webViewRef = useRef<WebViewHandle>(null);
  const [listo, setListo] = useState(false);

  // El HTML se genera una sola vez para que el WebView no se recargue en cada render.
  const html = useMemo(() => crearHtml(centro, zoom), []); // eslint-disable-line react-hooks/exhaustive-deps

  const ejecutar = (codigo: string) => {
    webViewRef.current?.injectJavaScript(`${codigo}; true;`);
  };

  useImperativeHandle(ref, () => ({
    volarA: (coordenada: Coordenada, nuevoZoom?: number) => {
      ejecutar(`window.volarA(${coordenada.latitude}, ${coordenada.longitude}, ${nuevoZoom ?? 'null'})`);
    },
  }));

  useEffect(() => {
    if (!listo) return;
    ejecutar(`window.setMarcadores(${JSON.stringify(marcadores)})`);
  }, [listo, marcadores]);

  useEffect(() => {
    if (!listo) return;
    ejecutar(`window.setUbicacionUsuario(${JSON.stringify(ubicacionUsuario)})`);
  }, [listo, ubicacionUsuario?.latitude, ubicacionUsuario?.longitude]);

  useEffect(() => {
    if (!listo) return;
    ejecutar(`window.centrar(${centro.latitude}, ${centro.longitude})`);
  }, [listo, centro.latitude, centro.longitude]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const datos = JSON.parse(event.nativeEvent.data);
      if (datos.tipo === 'listo') {
        setListo(true);
      } else if (datos.tipo === 'press') {
        onPress?.({ latitude: datos.latitude, longitude: datos.longitude });
      } else if (datos.tipo === 'marcador') {
        onMarcadorPress?.(datos.id);
      }
    } catch {
      // Mensaje no reconocido: se ignora
    }
  };

  return (
    <View style={[styles.contenedor, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        // OpenStreetMap exige identificar la app con Referer y User-Agent:
        // baseUrl define el Referer de las peticiones de teselas.
        source={{ html, baseUrl: 'https://github.com/Zehkas/RescatApp' }}
        applicationNameForUserAgent="RescatApp/1.0"
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        style={styles.webview}
      />
    </View>
  );
});

export default MapaOSM;

const styles = StyleSheet.create({
  contenedor: {
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
